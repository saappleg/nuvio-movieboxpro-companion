const DEFAULT_RETRYABLE_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "EAI_AGAIN",
  "ETIMEDOUT",
  "UND_ERR_CONNECT_TIMEOUT",
  "UND_ERR_HEADERS_TIMEOUT",
  "UND_ERR_SOCKET"
]);

export function classifyError(error) {
  const message = String(error?.message || error || "Unknown error");
  const lower = message.toLowerCase();

  if (/login required|not logged in|google_login|session expired/.test(lower)) {
    return {
      code: "login_required",
      label: "MovieBox login required",
      action: "Open the MovieBox login window and check the session again",
      retryable: false,
      message
    };
  }
  if (/timed out|timeout|econnreset|econnrefused|eai_again|network|fetch failed|socket/.test(lower)) {
    return {
      code: "network",
      label: "Network or timeout",
      action: "Check the companion network and retry",
      retryable: true,
      message
    };
  }
  if (/not found|no confident|no playable|source id/.test(lower)) {
    return {
      code: "not_found",
      label: "Title or source not found",
      action: "Try the title again later or verify the episode details",
      retryable: false,
      message
    };
  }
  if (/401|403|unauthorized|forbidden|api key|token/.test(lower)) {
    return {
      code: "configuration",
      label: "Configuration or authorization",
      action: "Check the saved API key or connected account",
      retryable: false,
      message
    };
  }
  return {
    code: "upstream",
    label: "Upstream service error",
    action: "Retry once; if it persists, run the health check",
    retryable: true,
    message
  };
}

export function isRetryableError(error) {
  if (error?.retryable === false) return false;
  if (error?.code && DEFAULT_RETRYABLE_CODES.has(error.code)) return true;
  return classifyError(error).retryable;
}

export async function withRetry(task, options = {}) {
  const retries = Math.max(0, Number(options.retries ?? 2));
  const delayMs = Math.max(0, Number(options.delayMs ?? 250));
  const factor = Math.max(1, Number(options.factor ?? 2));
  const shouldRetry = options.shouldRetry || isRetryableError;
  let attempt = 0;
  let lastError;

  while (attempt <= retries) {
    try {
      return await task(attempt);
    } catch (error) {
      lastError = error;
      if (attempt >= retries || !shouldRetry(error, attempt)) throw error;
      const wait = delayMs * (factor ** attempt);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      attempt++;
    }
  }

  throw lastError;
}

export function summarizeHealth(components = {}) {
  const values = Object.values(components).filter(Boolean);
  const hasError = values.some((component) => component.state === "error");
  const hasWarning = values.some((component) => component.state === "warning" || component.state === "unknown");
  return {
    status: hasError ? "error" : (hasWarning ? "warning" : "healthy"),
    components
  };
}

