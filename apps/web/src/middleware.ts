import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { FIREBASE_HOSTS, getServerPrimaryAppOrigin } from "@/lib/host-routing";

export function middleware(request: NextRequest) {
  const forwardedHost = request.headers.get("x-fh-requested-host");
  const host = forwardedHost || request.headers.get("host") || request.nextUrl.host;

  if (!FIREBASE_HOSTS.has(host)) {
    return NextResponse.next();
  }

  const target = new URL(
    request.nextUrl.pathname + request.nextUrl.search,
    getServerPrimaryAppOrigin(),
  );
  return NextResponse.redirect(target, 307);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|manifest.webmanifest|sitemap.xml).*)"],
};
