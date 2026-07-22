import { SignJWT, jwtVerify } from "jose";
import { getSessionSecret } from "@/lib/config";

const COOKIE_NAME = "rifago_admin_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12h

function secretKey() {
  return new TextEncoder().encode(getSessionSecret());
}

export async function createSessionToken(): Promise<string> {
  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload.role === "admin";
  } catch {
    return false;
  }
}

export { COOKIE_NAME, SESSION_DURATION_SECONDS };
