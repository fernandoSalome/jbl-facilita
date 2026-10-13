import { SignJWT, jwtVerify } from "jose";

// Usado também pelo middleware (Edge), então não pode importar Prisma nem bcrypt.

export const SESSION_COOKIE = "jbl_session";

export type Session = { sub: string; name: string; email: string; role: "ADMIN" | "USER" };

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("AUTH_SECRET não definido");
  return new TextEncoder().encode(s ?? "dev-secret-jbl-facilita");
}

export async function signSession(s: Session) {
  return new SignJWT(s).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret());
}

export async function verifySession(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as Session;
  } catch {
    return null;
  }
}
