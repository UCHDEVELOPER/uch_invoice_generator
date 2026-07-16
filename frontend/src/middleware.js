import { NextResponse } from "next/server";

export function middleware(req) {
  const token = req.cookies.get("auth_token")?.value ;
  const { pathname } = req.nextUrl;

  if (pathname === "/login" || pathname === "/reset-password") {
    if(token) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    else{
      return NextResponse.next();
    } 
  }

  if (!token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // matcher: ["/((?!_next|favicon.ico).*)"],
  matcher: [
  "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico|woff|woff2|ttf|eot)$).*)",
]
};
