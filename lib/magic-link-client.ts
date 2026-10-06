export type MagicLinkResponse = {
  ok?: boolean;
  delivered?: "email" | "bypass";
  magicLink?: string;
  error?: string;
  code?: string;
};

export async function requestMagicLink(
  email: string,
  redirect: string,
): Promise<MagicLinkResponse> {
  const response = await fetch("/api/auth/send-magic-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, redirect }),
  });
  const data = (await response.json().catch(() => null)) as MagicLinkResponse | null;
  if (!response.ok) {
    return {
      ok: false,
      error: data?.error || "Something went wrong. Try again.",
      code: data?.code,
    };
  }
  return data ?? { ok: true, delivered: "email" };
}
