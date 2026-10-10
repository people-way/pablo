import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { accountsConfigured } from "@/lib/supabase/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  if (!accountsConfigured()) {
    return NextResponse.json({ ok: true });
  }
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch (error) {
    console.error("Failed to sign out", error instanceof Error ? error.message : "");
  }
  return NextResponse.json({ ok: true });
}
