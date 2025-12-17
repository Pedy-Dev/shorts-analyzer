import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // 유지보수 모드 체크 (Vercel에서만 1로 설정됨)
  const maintenance = process.env.MAINTENANCE_MODE === "1";

  if (!maintenance) {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;

  // 유지보수 페이지 자체와 Next.js 내부 경로, 정적 파일은 통과
  if (
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/api/_next")
  ) {
    return NextResponse.next();
  }

  // 나머지 모든 경로는 유지보수 페이지로 리다이렉트
  const url = req.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.redirect(url);
}

// 전 경로에 미들웨어 적용
export const config = {
  matcher: ["/:path*"]
};
