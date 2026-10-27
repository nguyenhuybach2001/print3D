import { NextResponse } from "next/server";
import { makeSession, sessionCookieName, sessionTtl } from "@/lib/session";

export async function POST(request: Request) {
  const expected = process.env.APP_PASSWORD || process.env.IMPORT_PASSWORD;
  if (!expected) return NextResponse.json({ error: "Thiếu APP_PASSWORD trong biến môi trường server." }, { status: 503 });
  let body: { password?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 400 }); }
  if (body.password !== expected) return NextResponse.json({ error: "Mật khẩu chưa đúng." }, { status: 401 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieName(), makeSession(), { httpOnly: true, sameSite: "strict", secure: process.env.NODE_ENV === "production", path: "/", maxAge: sessionTtl() });
  return response;
}
