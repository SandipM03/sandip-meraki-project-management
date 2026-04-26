import { NextRequest, NextResponse } from "next/server";

const AUTH_COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "auth_token";
const protectedRoutes = ["/dashboard", "/projects", "/tasks", "/clients", "/team"];
const authRoutes = ["/signin", "/signup"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (token && authRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (!token && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
