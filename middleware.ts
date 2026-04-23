import { NextRequest, NextResponse } from "next/server";

const publicRoutes = ["/login", "/signup", "/"];
const protectedRoutes = ["/dashboard", "/projects", "/tasks"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("better-auth.session_token")?.value;

  
  if (token && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  
  if (!token && protectedRoutes.some((route) => pathname.startsWith(route))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
