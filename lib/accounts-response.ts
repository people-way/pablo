import {
  ACCOUNTS_SOON_MESSAGE,
  ACCOUNTS_SOON_TITLE,
  ACCOUNTS_UNAVAILABLE_CODE,
} from "./accounts-copy";

export function accountsUnavailablePayload() {
  return {
    ok: false as const,
    accountsAvailable: false as const,
    code: ACCOUNTS_UNAVAILABLE_CODE,
    error: `${ACCOUNTS_SOON_TITLE}. ${ACCOUNTS_SOON_MESSAGE}`,
  };
}

export function accountsUnavailableResponse(status = 503) {
  return Response.json(accountsUnavailablePayload(), { status });
}
