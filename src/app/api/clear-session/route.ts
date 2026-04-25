import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  // Delete the stale session cookie
  response.cookies.delete("weeek_session");
  return response;
}
