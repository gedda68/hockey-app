/**
 * Extracts a human-readable message from an unknown caught value.
 *
 * Usage in catch blocks:
 *   } catch (error) {
 *     setError(getErrorMessage(error));
 *   }
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error) return error;
  return "An unexpected error occurred";
}
