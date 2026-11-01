import { NextRequest, NextResponse } from "next/server";
import { resolveProxyTarget } from "./game-proxy";

const STRIP_REQUEST = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "te",
  "upgrade",
  "expect",
]);

const STRIP_RESPONSE = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "keep-alive",
]);

export async function forwardRequest(request: NextRequest) {
  const target = resolveProxyTarget(request.nextUrl.pathname, request.nextUrl.search);
  if (!target) return new NextResponse("Not found", { status: 404 });

  const headers = new Headers(request.headers);
  for (const name of STRIP_REQUEST) headers.delete(name);
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  if (target.segment) {
    headers.set("rsc", "1");
    headers.set("next-router-prefetch", "1");
    headers.set("next-router-segment-prefetch", target.segment);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.url, init);
  } catch {
    return new NextResponse("Bad gateway", { status: 502 });
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (STRIP_RESPONSE.has(key.toLowerCase()) || key.toLowerCase() === "set-cookie") return;
    responseHeaders.append(key, value);
  });
  const setCookies =
    typeof upstream.headers.getSetCookie === "function" ? upstream.headers.getSetCookie() : [];
  for (const cookie of setCookies) responseHeaders.append("set-cookie", cookie);
  if (target.segment || request.headers.get("next-router-segment-prefetch")) {
    responseHeaders.set("x-anarchik-proxy", "segment");
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
