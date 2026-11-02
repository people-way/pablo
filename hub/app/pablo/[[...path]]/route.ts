import type { NextRequest } from "next/server";
import { forwardRequest } from "@/lib/forward-request";

export const dynamic = "force-dynamic";

function forward(request: NextRequest) {
  return forwardRequest(request);
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;
