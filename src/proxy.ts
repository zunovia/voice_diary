import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, sha256Hex, timingSafeEqual } from "@/lib/access";

// 認証なしでもアクセスを許可するパス
// - /login と /api/login: ログインフロー自体
// - manifest / sw / アイコン類: PWAインストールに必要
const PUBLIC_PATHS = new Set([
  "/login",
  "/api/login",
  "/manifest.json",
  "/sw.js",
  "/favicon.png",
  "/favicon-16x16.png",
  "/favicon-32x32.png",
  "/icon-192x192.png",
  "/icon-512x512.png",
  "/apple-icon.png",
  "/logo.png",
]);

export async function proxy(request: NextRequest) {
  // APP_ACCESS_KEY 未設定（空白のみ含む）なら保護は無効（フェイルオープン）。
  // Vercel の環境変数に設定した時点で全ページ・全APIが保護される。
  const accessKey = (process.env.APP_ACCESS_KEY ?? "").trim();
  if (!accessKey) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  // Cookieはキー本体ではなくSHA-256ハッシュを保持している（/api/login参照）
  const cookie = request.cookies.get(ACCESS_COOKIE_NAME)?.value;
  if (cookie && timingSafeEqual(cookie, await sha256Hex(accessKey))) return NextResponse.next();

  // GitHub Actions のバックアップ等、自動化クライアント用のヘッダー認証
  const headerKey = request.headers.get("x-api-key");
  if (headerKey && timingSafeEqual(headerKey, accessKey)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.redirect(new URL("/login", request.url));
}

export const config = {
  // 静的アセットは対象外（それ以外は PUBLIC_PATHS のコード側判定に委ねる）
  matcher: ["/((?!_next/).*)"],
};
