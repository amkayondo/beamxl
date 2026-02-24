import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware: forward the request pathname as a header so server layouts
 * can read the current URL without needing client-side access.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set("x-pathname", request.nextUrl.pathname);
  return response;
}

export const config = {
  // Run on all dashboard routes; skip static files and API routes.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/).*)"],
};
