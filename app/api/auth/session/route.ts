import { getCurrentUser } from "@/lib/auth";
import { accountsConfigured } from "@/lib/db";
import { ACCOUNTS_UNAVAILABLE_CODE } from "@/lib/accounts-copy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!accountsConfigured()) {
    return Response.json({
      user: null,
      accountsAvailable: false,
      code: ACCOUNTS_UNAVAILABLE_CODE,
    });
  }

  let user;
  try {
    user = await getCurrentUser();
  } catch {
    return Response.json({ user: null, accountsAvailable: true });
  }
  if (!user) {
    return Response.json({ user: null, accountsAvailable: true });
  }
  return Response.json({
    accountsAvailable: true,
    user: {
      id: user.id,
      email: user.email,
      chess_com_username: user.chess_com_username,
    },
  });
}
