import {
  KeyObject,
  createCipheriv,
  createDecipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  createSign,
  randomBytes,
} from "node:crypto";

const CURVE = "prime256v1";
const AUTH_INFO = Buffer.from("WebPush: info\0", "utf8");
const KEY_INFO = Buffer.from("Content-Encoding: aes128gcm\0", "utf8");
const NONCE_INFO = Buffer.from("Content-Encoding: nonce\0", "utf8");
const RECORD_SIZE = 4096;

export interface PushSubscriptionKeys {
  p256dh: string;
  auth: string;
}

export function base64UrlEncode(input: Buffer): string {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function base64UrlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/");
  const remainder = padded.length % 4;
  return Buffer.from(
    remainder === 0 ? padded : padded + "=".repeat(4 - remainder),
    "base64",
  );
}

export function generateVapidKeys(): { publicKey: string; privateKey: string } {
  const ecdh = createECDH(CURVE);
  ecdh.generateKeys();
  return {
    publicKey: base64UrlEncode(ecdh.getPublicKey()),
    privateKey: base64UrlEncode(ecdh.getPrivateKey()),
  };
}

export function vapidAuthorization(
  endpoint: string,
  subject: string,
  publicKey: string,
  privateKey: string,
  expiresAtSeconds: number,
): string {
  const audience = new URL(endpoint).origin;
  const header = base64UrlEncode(
    Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" }), "utf8"),
  );
  const payload = base64UrlEncode(
    Buffer.from(
      JSON.stringify({ aud: audience, exp: expiresAtSeconds, sub: subject }),
      "utf8",
    ),
  );
  const signingInput = `${header}.${payload}`;

  const signer = createSign("SHA256");
  signer.update(signingInput);
  const der = signer.sign(privateKeyObject(privateKey, publicKey));

  return `vapid t=${signingInput}.${base64UrlEncode(derToJose(der))}, k=${publicKey}`;
}

export function encryptPayload(
  payload: string,
  keys: PushSubscriptionKeys,
  salt: Buffer = randomBytes(16),
  serverKeys = newServerKeys(),
): Buffer {
  const clientPublicKey = base64UrlDecode(keys.p256dh);
  const authSecret = base64UrlDecode(keys.auth);
  const serverPublicKey = serverKeys.getPublicKey();
  const sharedSecret = serverKeys.computeSecret(clientPublicKey);

  const prkKey = hkdf(
    authSecret,
    sharedSecret,
    Buffer.concat([AUTH_INFO, clientPublicKey, serverPublicKey]),
    32,
  );
  const contentEncryptionKey = hkdf(salt, prkKey, KEY_INFO, 16);
  const nonce = hkdf(salt, prkKey, NONCE_INFO, 12);

  const plaintext = Buffer.concat([
    Buffer.from(payload, "utf8"),
    Buffer.from([2]),
  ]);
  const cipher = createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  const header = Buffer.alloc(5);
  header.writeUInt32BE(RECORD_SIZE, 0);
  header.writeUInt8(serverPublicKey.length, 4);

  return Buffer.concat([salt, header, serverPublicKey, ciphertext]);
}

export function decryptPayload(
  body: Buffer,
  receiverPrivateKey: Buffer,
  authSecret: Buffer,
  receiverPublicKey: Buffer,
): string {
  const salt = body.subarray(0, 16);
  const keyLength = body.readUInt8(20);
  const serverPublicKey = body.subarray(21, 21 + keyLength);
  const ciphertext = body.subarray(21 + keyLength);

  const ecdh = createECDH(CURVE);
  ecdh.setPrivateKey(receiverPrivateKey);
  const sharedSecret = ecdh.computeSecret(serverPublicKey);

  const prkKey = hkdf(
    authSecret,
    sharedSecret,
    Buffer.concat([AUTH_INFO, receiverPublicKey, serverPublicKey]),
    32,
  );
  const contentEncryptionKey = hkdf(salt, prkKey, KEY_INFO, 16);
  const nonce = hkdf(salt, prkKey, NONCE_INFO, 12);

  const tag = ciphertext.subarray(ciphertext.length - 16);
  const sealed = ciphertext.subarray(0, ciphertext.length - 16);
  const decipher = createDecipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  decipher.setAuthTag(tag);

  const plaintext = Buffer.concat([decipher.update(sealed), decipher.final()]);
  return plaintext.subarray(0, plaintext.length - 1).toString("utf8");
}

function newServerKeys(): ReturnType<typeof createECDH> {
  const ecdh = createECDH(CURVE);
  ecdh.generateKeys();
  return ecdh;
}

function hkdf(
  salt: Buffer,
  ikm: Buffer,
  info: Buffer,
  length: number,
): Buffer {
  const prk = createHmac("sha256", salt).update(ikm).digest();
  const output = createHmac("sha256", prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest();
  return output.subarray(0, length);
}

function derToJose(der: Buffer): Buffer {
  let offset = 2;
  if (der[1] & 0x80) offset += der[1] & 0x7f;

  const readInteger = (): Buffer => {
    offset += 1;
    const length = der[offset];
    offset += 1;
    let value = der.subarray(offset, offset + length);
    offset += length;
    while (value.length > 32 && value[0] === 0) value = value.subarray(1);
    return Buffer.concat([Buffer.alloc(32 - value.length), value]);
  };

  return Buffer.concat([readInteger(), readInteger()]);
}

function privateKeyObject(privateKey: string, publicKey: string): KeyObject {
  const publicBytes = base64UrlDecode(publicKey);
  return createPrivateKey({
    format: "jwk",
    key: {
      kty: "EC",
      crv: "P-256",
      d: privateKey,
      x: base64UrlEncode(publicBytes.subarray(1, 33)),
      y: base64UrlEncode(publicBytes.subarray(33, 65)),
    },
  });
}
