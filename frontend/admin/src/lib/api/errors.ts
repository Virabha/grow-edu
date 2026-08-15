export interface ApiError {
  message: string;
  messages: string[];
  statusCode: number | null;
  fieldErrors: Record<string, string>;
  isNetworkError: boolean;
  isTimeout: boolean;
}

const STATUS_FALLBACKS: Record<number, string> = {
  400: "That request was not valid.",
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "We could not find what you were looking for.",
  409: "That conflicts with something that already exists.",
  413: "That file is too large.",
  422: "Some of the details you entered are not valid.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on our side. Please try again.",
  502: "The server is unreachable right now. Please try again.",
  503: "The service is temporarily unavailable. Please try again.",
  504: "The server took too long to respond. Please try again.",
};

export function getApiError(err: unknown, fallback = "Something went wrong"): ApiError {
  const capitalise = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

  const empty: ApiError = {
    message: fallback,
    messages: [],
    statusCode: null,
    fieldErrors: {},
    isNetworkError: false,
    isTimeout: false,
  };

  if (typeof err === "string" && err.trim() !== "") {
    return { ...empty, message: err, messages: [err] };
  }
  if (typeof err !== "object" || err === null) return empty;

  const source: Record<string, unknown> = { ...err };
  const code = typeof source.code === "string" ? source.code : null;
  const isTimeout = code === "ECONNABORTED" || code === "ETIMEDOUT";
  const response =
    typeof source.response === "object" && source.response !== null
      ? (source.response as Record<string, unknown>)
      : null;

  if (response === null) {
    const message =
      typeof source.message === "string" && source.message.trim() !== ""
        ? source.message
        : fallback;
    return {
      ...empty,
      message,
      messages: [message],
      isNetworkError: code === "ERR_NETWORK" || source.message === "Network Error" || isTimeout,
      isTimeout,
    };
  }

  const statusCode = typeof response.status === "number" ? response.status : null;
  const data =
    typeof response.data === "object" && response.data !== null
      ? (response.data as Record<string, unknown>)
      : null;

  const messages: string[] = [];
  for (const candidate of [data?.message, data?.error]) {
    if (typeof candidate === "string" && candidate.trim() !== "") messages.push(candidate);
    else if (Array.isArray(candidate)) {
      for (const entry of candidate) {
        if (typeof entry === "string" && entry.trim() !== "") messages.push(entry);
      }
    }
    if (messages.length > 0) break;
  }

  const fieldErrors: Record<string, string> = {};
  for (const entry of messages) {
    const field = /^([A-Za-z_][A-Za-z0-9_]*)(?:\.[A-Za-z0-9_]+)*\s/.exec(entry)?.[1];
    if (field !== undefined && fieldErrors[field] === undefined) {
      fieldErrors[field] = capitalise(entry);
    }
  }

  const [first] = messages;

  return {
    message:
      first !== undefined
        ? capitalise(first)
        : ((statusCode !== null ? STATUS_FALLBACKS[statusCode] : undefined) ?? fallback),
    messages,
    statusCode,
    fieldErrors,
    isNetworkError: false,
    isTimeout,
  };
}
