/**
 * Backup encryption (Node crypto only — works on every host).
 *
 * File layout  "PFBK" | ver(1)=1 | kdf(1) | logN(1) | r(1) | p(1) | salt(16) | iv(12) | ciphertext | tag(16)
 *   kdf 1 = password  → key = scrypt(password, salt, N=2^logN, r, p)      (files you download / upload)
 *   kdf 0 = server key → key = HKDF-SHA256(BACKUP_SECRET || AUTH_SECRET)   (copies kept on the server, "at rest")
 * The whole header is authenticated (AES-256-GCM additional data), so it can't be altered either.
 */
import crypto from "node:crypto";

const MAGIC = Buffer.from("PFBK");
const HEADER_LEN = 4 + 1 + 1 + 3 + 16 + 12; // 37
const TAG_LEN = 16;
export const MIN_PASSWORD_LENGTH = 10;

export class BackupCryptoError extends Error {
  constructor(
    message: string,
    public code: "wrong_password" | "corrupt" | "no_secret",
  ) {
    super(message);
  }
}

export function isEncrypted(bytes: Uint8Array): boolean {
  return bytes.length > HEADER_LEN + TAG_LEN && Buffer.from(bytes.subarray(0, 4)).equals(MAGIC);
}

/** Which kind of key a PFBK file needs: "password" or "server". */
export function encryptionKind(bytes: Uint8Array): "password" | "server" | null {
  if (!isEncrypted(bytes)) return null;
  return bytes[5] === 1 ? "password" : "server";
}

function serverKey(): Buffer {
  const secret = process.env.BACKUP_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === "production") throw new BackupCryptoError("BACKUP_SECRET or AUTH_SECRET (32+ chars) must be set.", "no_secret");
    return Buffer.from(crypto.hkdfSync("sha256", "dev-only-insecure-secret-change-me-please-0123456789", "pf-backup", "backup-at-rest-v1", 32));
  }
  return Buffer.from(crypto.hkdfSync("sha256", secret, "pf-backup", "backup-at-rest-v1", 32));
}

function scryptKey(password: string, salt: Buffer, logN: number, r: number, p: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    crypto.scrypt(password.normalize("NFKC"), salt, 32, { N: 2 ** logN, r, p, maxmem: 256 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

async function seal(plain: Uint8Array, kdf: 0 | 1, password?: string): Promise<Uint8Array> {
  const logN = 15, r = 8, p = 1;
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const header = Buffer.concat([MAGIC, Buffer.from([1, kdf, logN, r, p]), salt, iv]);
  const key = kdf === 1 ? await scryptKey(password!, salt, logN, r, p) : serverKey();
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(header);
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return new Uint8Array(Buffer.concat([header, body, cipher.getAuthTag()]));
}

async function open(data: Uint8Array, password?: string): Promise<Uint8Array> {
  if (!isEncrypted(data)) throw new BackupCryptoError("This file is not an encrypted backup.", "corrupt");
  const buf = Buffer.from(data);
  const header = buf.subarray(0, HEADER_LEN);
  const [ver, kdf, logN, r, p] = header.subarray(4, 9);
  if (ver !== 1 || logN < 10 || logN > 20 || r < 1 || r > 16 || p < 1 || p > 4) throw new BackupCryptoError("Unsupported or damaged backup header.", "corrupt");
  const salt = header.subarray(9, 25);
  const iv = header.subarray(25, 37);
  let key: Buffer;
  if (kdf === 1) {
    if (!password) throw new BackupCryptoError("This backup is password-protected. Enter its password.", "wrong_password");
    key = await scryptKey(password, salt, logN, r, p);
  } else key = serverKey();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(header);
  decipher.setAuthTag(buf.subarray(buf.length - TAG_LEN));
  try {
    return new Uint8Array(Buffer.concat([decipher.update(buf.subarray(HEADER_LEN, buf.length - TAG_LEN)), decipher.final()]));
  } catch {
    throw kdf === 1
      ? new BackupCryptoError("Wrong password, or the file is damaged.", "wrong_password")
      : new BackupCryptoError("This server copy can't be decrypted (BACKUP_SECRET / AUTH_SECRET changed?) or it is damaged.", "corrupt");
  }
}

export const encryptWithPassword = async (plain: Uint8Array, password: string) => {
  if (password.length < MIN_PASSWORD_LENGTH) throw new BackupCryptoError(`Backup password must be at least ${MIN_PASSWORD_LENGTH} characters.`, "wrong_password");
  return seal(plain, 1, password);
};
export const decryptWithPassword = (data: Uint8Array, password: string) => open(data, password);
export const encryptAtRest = (plain: Uint8Array) => seal(plain, 0);
export const decryptAtRest = (data: Uint8Array) => open(data);

export const sha256 = (bytes: Uint8Array) => crypto.createHash("sha256").update(bytes).digest("hex");

/** Constant-time compare for secrets such as CRON_SECRET. */
export function safeEqual(a: string, b: string): boolean {
  const x = crypto.createHash("sha256").update(a).digest();
  const y = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(x, y) && a.length === b.length;
}
