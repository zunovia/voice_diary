import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ACCESS_COOKIE_NAME, ACCESS_COOKIE_MAX_AGE, sha256Hex, timingSafeEqual } from "@/lib/access";

export async function POST(request: NextRequest) {
  const accessKey = (process.env.APP_ACCESS_KEY ?? "").trim();

  // 保護が無効な環境ではログイン不要（クライアントはそのままトップへ戻る）
  if (!accessKey) {
    return NextResponse.json({ ok: true, protected: false });
  }

  let key = "";
  try {
    const body = await request.json();
    // APP_ACCESS_KEY 側も trim 済みのため、貼り付け時の末尾改行・空白で弾かれないよう揃える
    key = typeof body?.key === "string" ? body.key.trim() : "";
  } catch {
    // JSONでないリクエストは空キー扱い
  }

  if (!key || !timingSafeEqual(key, accessKey)) {
    // 総当たりの摩擦として失敗時のみ一定の遅延を入れる
    await new Promise((resolve) => setTimeout(resolve, 500));
    return NextResponse.json({ ok: false, error: "invalid_key" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, protected: true });
  res.cookies.set(ACCESS_COOKIE_NAME, await sha256Hex(accessKey), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: "/",
  });
  return res;
}
