import { NextResponse, type NextRequest } from "next/server";

function getRequestOrigin(request: NextRequest): string {
  return request.nextUrl.origin;
}

function getHeaderOrigin(value: string | null): string | null {
  if (!value) return null;

  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function assertSameOrigin(request: NextRequest): NextResponse | null {
  const requestOrigin = getRequestOrigin(request);
  const origin = getHeaderOrigin(request.headers.get("origin"));
  const referer = getHeaderOrigin(request.headers.get("referer"));

  if (origin === requestOrigin || referer === requestOrigin) {
    return null;
  }

  return NextResponse.json(
    { error: "CSRF 검증에 실패했습니다." },
    { status: 403 },
  );
}
