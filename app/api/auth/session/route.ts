import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return Response.json({ user: null });
  }
  if (!user) {
    return Response.json({ user: null });
  }
  return Response.json({
    user: {
      id: user.id,
      email: user.email,
      chess_com_username: user.chess_com_username,
    },
  });
}
