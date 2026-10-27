import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const cookieName = "b3d_session";
const ttlSeconds = 60 * 60 * 12;

function secret() { return process.env.APP_PASSWORD || process.env.IMPORT_PASSWORD || ""; }
function signature(expires: string) { return createHmac("sha256", secret()).update(expires).digest("hex"); }
export function makeSession() {
  const expires = String(Math.floor(Date.now() / 1000) + ttlSeconds);
  return `${expires}.${signature(expires)}`;
}
export function verifySession(token?: string | null) {
  if (!token || !secret()) return false;
  const [expires, supplied] = token.split(".");
  if (!expires || !supplied || Number(expires) <= Math.floor(Date.now() / 1000)) return false;
  const expected = signature(expires);
  const actualBytes = Buffer.from(supplied);
  const expectedBytes = Buffer.from(expected);
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}
export function verifyRequestSession(request: Request) {
  const cookie = request.headers.get("cookie")?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  return verifySession(cookie?.slice(cookieName.length + 1));
}
export function sessionCookieName() { return cookieName; }
export function sessionTtl() { return ttlSeconds; }
