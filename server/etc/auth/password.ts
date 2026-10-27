import {
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 128;

const SCRYPT_N = 16_384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 32 * 1024 * 1024;
const SALT_BYTES = 16;

type QueueWaiter = () => void;

/** Keeps password KDF work bounded even if an attacker sends parallel requests. */
class Semaphore {
  private active = 0;
  private readonly queue: QueueWaiter[] = [];

  async acquire(): Promise<() => void> {
    if (this.active < 2) {
      this.active += 1;
      return () => this.release();
    }
    await new Promise<void>(resolve => this.queue.push(resolve));
    this.active += 1;
    return () => this.release();
  }

  private release() {
    this.active = Math.max(0, this.active - 1);
    const next = this.queue.shift();
    if (next) next();
  }
}

const scryptSlots = new Semaphore();

export function isValidPassword(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= PASSWORD_MIN_LENGTH &&
    value.length <= PASSWORD_MAX_LENGTH
  );
}

export function assertValidPassword(value: unknown): asserts value is string {
  if (!isValidPassword(value))
    throw new Error("Password must be between 12 and 128 characters");
}

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    nodeScrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: SCRYPT_N,
        r: SCRYPT_R,
        p: SCRYPT_P,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derived) => {
        if (error) reject(error);
        else resolve(derived);
      }
    );
  });
}

async function withScryptSlot<T>(work: () => Promise<T>): Promise<T> {
  const release = await scryptSlots.acquire();
  try {
    return await work();
  } finally {
    release();
  }
}

/** Encoded format: scrypt$N$r$p$base64url(salt)$base64url(hash). */
export async function hashPassword(password: string): Promise<string> {
  assertValidPassword(password);
  const salt = randomBytes(SALT_BYTES);
  const derived = await withScryptSlot(() => derive(password, salt));
  return [
    "scrypt",
    String(SCRYPT_N),
    String(SCRYPT_R),
    String(SCRYPT_P),
    salt.toString("base64url"),
    derived.toString("base64url"),
  ].join("$");
}

function parseEncodedHash(value: string): {
  n: number;
  r: number;
  p: number;
  salt: Buffer;
  digest: Buffer;
} | null {
  const parts = value.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return null;
  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (
    n !== SCRYPT_N ||
    r !== SCRYPT_R ||
    p !== SCRYPT_P ||
    !/^[-_A-Za-z0-9]+$/.test(parts[4] ?? "") ||
    !/^[-_A-Za-z0-9]+$/.test(parts[5] ?? "")
  )
    return null;
  try {
    const salt = Buffer.from(parts[4]!, "base64url");
    const digest = Buffer.from(parts[5]!, "base64url");
    if (salt.length !== SALT_BYTES || digest.length !== SCRYPT_KEY_LENGTH)
      return null;
    return { n, r, p, salt, digest };
  } catch {
    return null;
  }
}

export async function verifyPassword(
  password: string,
  encodedHash: string
): Promise<boolean> {
  if (!isValidPassword(password)) return false;
  const parsed = parseEncodedHash(encodedHash);
  if (!parsed) return false;
  const derived = await withScryptSlot(() => derive(password, parsed.salt));
  return (
    derived.length === parsed.digest.length &&
    timingSafeEqual(derived, parsed.digest)
  );
}

let dummyHashPromise: Promise<string> | null = null;

/** Performs the same KDF work for unknown accounts to reduce login timing leaks. */
export function dummyPasswordHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword("dummy-password-12");
  return dummyHashPromise;
}
