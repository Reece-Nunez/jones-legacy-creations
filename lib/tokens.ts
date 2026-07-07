import { randomBytes } from "crypto";

/**
 * Cryptographically random URL-safe token used as the trust boundary for the
 * public change-order signing / selection-approval links. 32 bytes ≈ 256 bits
 * of entropy, base64url-encoded — same strength as the existing invoice/DD
 * upload tokens.
 */
export function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
