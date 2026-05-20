import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, timingSafeEqual } from "crypto";
import { AppConfigService } from "../../config";

export interface PhonePeInitiateResult {
  paymentUrl: string;
  merchantTransactionId: string;
}

export interface PhonePeStatusResult {
  status: "PENDING" | "COMPLETED" | "FAILED";
  code: string;
  amount?: number;
  providerTransactionId?: string;
}

interface PhonePeInitiateResponse {
  success: boolean;
  code?: string;
  message?: string;
  data?: {
    instrumentResponse?: {
      redirectInfo?: { url?: string };
    };
  };
}

interface PhonePeStatusResponse {
  success: boolean;
  code?: string;
  data?: {
    state?: string;
    amount?: number;
    transactionId?: string;
  };
}

@Injectable()
export class PhonePeService {
  private readonly logger = new Logger(PhonePeService.name);

  constructor(private readonly configService: AppConfigService) {}

  private creds() {
    const merchantId = this.configService.phonepeMerchantId;
    const saltKey = this.configService.phonepeSaltKey;
    const saltIndex = this.configService.phonepeSaltIndex;
    const baseUrl = this.configService.phonepeBaseUrl;
    if (!merchantId || !saltKey || !saltIndex || !baseUrl) {
      throw new InternalServerErrorException(
        "PhonePe is not configured. Set PHONEPE_MERCHANT_ID, PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX, PHONEPE_BASE_URL.",
      );
    }
    return { merchantId, saltKey, saltIndex, baseUrl };
  }

  private sign(payloadBase64: string, path: string, saltKey: string, saltIndex: string) {
    const checksum = createHash("sha256")
      .update(payloadBase64 + path + saltKey)
      .digest("hex");
    return `${checksum}###${saltIndex}`;
  }

  async initiate(input: {
    merchantTransactionId: string;
    amountInPaise: number;
    userId: string;
    redirectUrl: string;
    callbackUrl: string;
  }): Promise<PhonePeInitiateResult> {
    const { merchantId, saltKey, saltIndex, baseUrl } = this.creds();

    if (input.amountInPaise < 100) {
      throw new BadRequestException("Amount must be at least ₹1 (100 paise).");
    }

    const payload = {
      merchantId,
      merchantTransactionId: input.merchantTransactionId,
      merchantUserId: input.userId,
      amount: input.amountInPaise,
      redirectUrl: input.redirectUrl,
      redirectMode: "REDIRECT",
      callbackUrl: input.callbackUrl,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString("base64");
    const verify = this.sign(payloadBase64, "/pg/v1/pay", saltKey, saltIndex);

    const res = await fetch(`${baseUrl}/pg/v1/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-VERIFY": verify,
      },
      body: JSON.stringify({ request: payloadBase64 }),
    });

    const body = (await res.json()) as PhonePeInitiateResponse;
    if (!res.ok || !body.success) {
      this.logger.error(
        `PhonePe initiate failed: ${res.status} ${body.code ?? ""} ${body.message ?? ""}`,
      );
      throw new BadRequestException(body.message ?? "PhonePe initiation failed");
    }

    const paymentUrl = body.data?.instrumentResponse?.redirectInfo?.url;
    if (!paymentUrl) {
      throw new InternalServerErrorException(
        "PhonePe response missing redirect URL",
      );
    }
    return { paymentUrl, merchantTransactionId: input.merchantTransactionId };
  }

  async checkStatus(merchantTransactionId: string): Promise<PhonePeStatusResult> {
    const { merchantId, saltKey, saltIndex, baseUrl } = this.creds();
    const path = `/pg/v1/status/${merchantId}/${merchantTransactionId}`;
    const checksum = createHash("sha256")
      .update(path + saltKey)
      .digest("hex");
    const xVerify = `${checksum}###${saltIndex}`;

    const res = await fetch(`${baseUrl}${path}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        accept: "application/json",
        "X-VERIFY": xVerify,
        "X-MERCHANT-ID": merchantId,
      },
    });

    const body = (await res.json()) as PhonePeStatusResponse;
    if (!res.ok) {
      this.logger.error(
        `PhonePe status check failed: ${res.status} ${body.code ?? ""}`,
      );
      throw new BadRequestException("Couldn't fetch PhonePe status");
    }

    const state = body.data?.state ?? body.code ?? "";
    let status: PhonePeStatusResult["status"];
    if (state === "COMPLETED" || body.code === "PAYMENT_SUCCESS") {
      status = "COMPLETED";
    } else if (state === "PENDING" || body.code === "PAYMENT_PENDING") {
      status = "PENDING";
    } else {
      status = "FAILED";
    }

    return {
      status,
      code: body.code ?? state ?? "UNKNOWN",
      amount: body.data?.amount,
      providerTransactionId: body.data?.transactionId,
    };
  }

  verifyCallbackSignature(rawBody: string, xVerify: string | undefined): void {
    const { saltKey, saltIndex } = this.creds();
    if (!xVerify) {
      throw new UnauthorizedException("Missing X-VERIFY header");
    }
    const expected = createHash("sha256")
      .update(rawBody + saltKey)
      .digest("hex");
    const expectedHeader = `${expected}###${saltIndex}`;
    const a = Buffer.from(xVerify);
    const b = Buffer.from(expectedHeader);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException("Invalid PhonePe signature");
    }
  }
}
