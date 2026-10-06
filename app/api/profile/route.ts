import type { NextRequest } from "next/server";
import { getCurrentUser, normalizeChessComUsername, updateChessUsername } from "@/lib/auth";
import { isSampleUsername } from "@/lib/sample-games";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest) {
  let user;
  try {
    user = await getCurrentUser();
  } catch (error) {
    console.error("Profile auth lookup failed", error instanceof Error ? error.message : "");
    return Response.json(
      { error: "Account storage is unavailable. Set DATABASE_URL and try again." },
      { status: 503 },
    );
  }
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { chess_com_username?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const username = normalizeChessComUsername(body.chess_com_username);
  if (!username) {
    return Response.json(
      {
        error:
          "Enter a Chess.com username: 3–25 letters, numbers, underscores, or hyphens.",
      },
      { status: 400 },
    );
  }
  if (isSampleUsername(username)) {
    return Response.json(
      { error: "That username is reserved for the sample demo." },
      { status: 400 },
    );
  }

  try {
    await updateChessUsername(user.id, username, { migrateHistory: true });
  } catch (error) {
    console.error(
      "Failed to update Chess.com username",
      error instanceof Error ? error.message : "",
    );
    return Response.json(
      { error: "Couldn't save that Chess.com username." },
      { status: 500 },
    );
  }

  return Response.json({ ok: true, chess_com_username: username });
}
