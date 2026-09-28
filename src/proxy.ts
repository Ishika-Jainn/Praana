import { NextResponse, type NextRequest } from "next/server";

// Cookie-less fallback for embedded previews: a signed session token in `?as=`
// (or the x-praana-session header added by the client) is forwarded to the app,
// where it is verified. Unsigned values are rejected there.
export function proxy(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("as") || request.headers.get("x-praana-session");
  if (!token || !/^[\w-]+\.\d+\.[\w-]+$/.test(token)) return NextResponse.next();
  const headers = new Headers(request.headers);
  headers.set("x-praana-session", token);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/console/:path*", "/api/:path*"] };
