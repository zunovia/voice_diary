// アクセスキー保護の共通定義（proxy.ts と /api/login で共用）
// Edge Runtime で動くよう Node の crypto には依存しない

export const ACCESS_COOKIE_NAME = "vd_access";
export const ACCESS_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1年

// Cookieには生のキーではなくSHA-256ハッシュを保存する
// （Cookieが漏れてもマスターキー本体＝x-api-key用の値は露出しない）
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const ab = encoder.encode(a);
  const bb = encoder.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) {
    diff |= ab[i] ^ bb[i];
  }
  return diff === 0;
}
