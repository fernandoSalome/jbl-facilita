import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export async function middleware(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;

  if (pathname.startsWith("/app") && !session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/app", req.url));
  }
  return NextResponse.next();
}

// "/" é o site institucional público (src/app/(site)).
export const config = { matcher: ["/login", "/app/:path*"] };
