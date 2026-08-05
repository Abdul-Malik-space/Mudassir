import { API_BASE_URL } from "../config/api";

const CSRF_STORAGE_KEY = "erp_csrf_token";
let installed = false;

const isMutation = (method) =>
  !["GET", "HEAD", "OPTIONS"].includes(String(method || "GET").toUpperCase());

const isApiRequest = (input) => {
  try {
    const rawUrl = typeof input === "string" ? input : input?.url;
    const requestUrl = new URL(rawUrl, window.location.origin);
    const apiUrl = new URL(API_BASE_URL, window.location.origin);

    return (
      requestUrl.origin === apiUrl.origin &&
      requestUrl.pathname.startsWith(apiUrl.pathname.replace(/\/$/, ""))
    );
  } catch {
    return false;
  }
};

export const installSecureFetch = () => {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input, init = {}) => {
    if (!isApiRequest(input)) {
      return nativeFetch(input, init);
    }

    const requestMethod = String(
      init.method || (input instanceof Request ? input.method : "GET")
    ).toUpperCase();

    const headers = new Headers(
      init.headers || (input instanceof Request ? input.headers : undefined)
    );

    const csrfToken = sessionStorage.getItem(CSRF_STORAGE_KEY);
    if (isMutation(requestMethod) && csrfToken) {
      headers.set("X-CSRF-Token", csrfToken);
    }

    const response = await nativeFetch(input, {
      ...init,
      method: requestMethod,
      headers,
      credentials: "include",
    });

    if ([401, 428].includes(response.status)) {
      window.dispatchEvent(
        new CustomEvent("erp-auth-state", {
          detail: {
            status: response.status,
            url: typeof input === "string" ? input : input?.url,
          },
        })
      );
    }

    return response;
  };
};

export const saveCsrfToken = (token) => {
  if (token) sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  else sessionStorage.removeItem(CSRF_STORAGE_KEY);
};
