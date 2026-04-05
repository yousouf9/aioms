import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

export type AggregatorSession = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  profileImageUrl: string | null;
  isEmailVerified: boolean;
};

const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
const COOKIE_NAME = "aioms_aggregator";
const EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days

export async function signAggregatorToken(payload: AggregatorSession): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${EXPIRES_IN}s`)
    .sign(secret);
}

export async function verifyAggregatorToken(token: string): Promise<AggregatorSession | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AggregatorSession;
  } catch {
    return null;
  }
}

export async function getAggregatorSession(): Promise<AggregatorSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAggregatorToken(token);
}

export async function setAggregatorCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: EXPIRES_IN,
    path: "/",
  });
}

export async function clearAggregatorCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export { COOKIE_NAME as AGGREGATOR_COOKIE_NAME };
