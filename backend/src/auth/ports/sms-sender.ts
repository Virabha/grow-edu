import { Injectable, Logger } from '@nestjs/common';

export const SMS_SENDER = 'SMS_SENDER';

export interface SmsSender {
  send(phone: string, message: string): Promise<void>;
}

@Injectable()
export class LogSmsSender implements SmsSender {
  private readonly logger = new Logger(LogSmsSender.name);

  async send(phone: string, message: string): Promise<void> {
    this.logger.log(`[SMS] to=${phone} body=${message}`);
  }
}
