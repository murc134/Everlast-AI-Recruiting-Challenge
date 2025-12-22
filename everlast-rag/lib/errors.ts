type NextNavigationError = {
  digest?: string;
};

export function toErrorMessage(error: unknown, fallback = "Unknown error") {
  if (typeof error === "string" && error.trim()) return error;
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    const message = (error as { message?: string }).message;
    if (message && message.trim()) return message;
  }
  return fallback;
}

export function isNextNavigationError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const digest = (error as NextNavigationError).digest;
  if (typeof digest !== "string") return false;
  return digest.startsWith("NEXT_REDIRECT") || digest.startsWith("NEXT_NOT_FOUND");
}
