import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { StaffSession } from "@/types";

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "aioms_session";
const EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

export async function signToken(payload: StaffSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<StaffSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as StaffSession;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<StaffSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EXPIRES_IN,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME };
