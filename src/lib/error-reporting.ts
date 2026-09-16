/**
 * PrivAgentShield — Runtime Error Reporting Utility
 * Captures and logs unhandled errors from React error boundaries.
 */

type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportRuntimeError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Log to console for debugging
  console.error("[PrivAgentShield Error]", {
    message,
    stack,
    context,
    route: window.location.pathname,
  });
}

