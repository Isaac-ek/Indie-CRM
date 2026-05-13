import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const pathname = req.nextUrl.pathname;
  const isProtectedRoute = pathname.startsWith("/w/");
  const isAuthPage = pathname === "/login" || pathname === "/register";
  const isLoggedIn = !!req.auth;

  if (isProtectedRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL("/", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/w/:path*", "/login", "/register"],
};
