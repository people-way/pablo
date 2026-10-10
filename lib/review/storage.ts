import type { SavedReview, Side } from "./types";

export const REVIEW_STORAGE_KEY = "pablo.revue.v1";
export const MAX_SAVED_REVIEWS = 30;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function readSaved(storage: Pick<Storage, "getItem">): SavedReview[] {
  const raw = storage.getItem(REVIEW_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSavedReview).slice(0, MAX_SAVED_REVIEWS);
  } catch {
    return [];
  }
}

export function writeSaved(storage: Pick<Storage, "setItem">, reviews: SavedReview[]) {
  storage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(reviews.slice(0, MAX_SAVED_REVIEWS)));
}

export function upsertSaved(storage: StorageLike, review: SavedReview) {
  const current = readSaved(storage).filter((item) => item.id !== review.id);
  const next = [review, ...current].slice(0, MAX_SAVED_REVIEWS);
  writeSaved(storage, next);
  return next;
}

export function removeSaved(storage: StorageLike, id: string) {
  const next = readSaved(storage).filter((item) => item.id !== id);
  writeSaved(storage, next);
  return next;
}

function isSavedReview(value: unknown): value is SavedReview {
  if (!value || typeof value !== "object") {
    return false;
  }

  const review = value as Partial<SavedReview>;
  return (
    typeof review.id === "string" &&
    typeof review.savedAt === "string" &&
    typeof review.title === "string" &&
    (typeof review.pgn === "string" || review.pgn === null) &&
    (typeof review.fen === "string" || review.fen === null) &&
    Array.isArray(review.analyses) &&
    Array.isArray(review.nodeEvals) &&
    isSide(review.viewer)
  );
}

function isSide(value: unknown): value is Side | null {
  return value === "w" || value === "b" || value === null;
}
