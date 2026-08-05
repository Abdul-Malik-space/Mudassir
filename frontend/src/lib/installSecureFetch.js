import { API_BASE_URL } from "../config/api";

const CSRF_STORAGE_KEY = "erp_csrf_token";
const INSTALL_FLAG = "__erp_secure_fetch_installed__";

const isMutation = (method) =>
  !["GET", "HEAD", "OPTIONS"].includes(
    String(method || "GET").toUpperCase()
  );

const trimTrailingSlashes = (value) =>
  String(value || "").replace(/\/+$/, "");

const getInputUrl = (input) => {
  if (typeof input === "string") {
    return input;
  }

  if (
    typeof URL !== "undefined" &&
    input instanceof URL
  ) {
    return input.toString();
  }

  if (
    typeof Request !== "undefined" &&
    input instanceof Request
  ) {
    return input.url;
  }

  return input?.url || "";
};

const getRequestUrl = (input) => {
  try {
    return new URL(
      getInputUrl(input),
      window.location.origin
    );
  } catch {
    return null;
  }
};

const getApiUrl = () => {
  try {
    return new URL(
      API_BASE_URL,
      window.location.origin
    );
  } catch {
    return null;
  }
};

const isApiRequest = (input) => {
  const requestUrl = getRequestUrl(input);
  const apiUrl = getApiUrl();

  if (!requestUrl || !apiUrl) {
    return false;
  }

  if (requestUrl.origin !== apiUrl.origin) {
    return false;
  }

  const basePath =
    trimTrailingSlashes(apiUrl.pathname) || "/";

  const requestPath = requestUrl.pathname;

  return (
    basePath === "/" ||
    requestPath === basePath ||
    requestPath.startsWith(`${basePath}/`)
  );
};

const isPublicAuthRequest = (input) => {
  const requestUrl = getRequestUrl(input);

  if (!requestUrl) {
    return false;
  }

  const path = trimTrailingSlashes(
    requestUrl.pathname
  );

  return (
    path.endsWith("/auth/login") ||
    path.endsWith("/auth/me")
  );
};

const dispatchAuthState = (
  status,
  input
) => {
  window.dispatchEvent(
    new CustomEvent("erp-auth-state", {
      detail: {
        status,
        url: getInputUrl(input),
      },
    })
  );
};

export const getCsrfToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage.getItem(
    CSRF_STORAGE_KEY
  );
};

export const saveCsrfToken = (token) => {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.sessionStorage.setItem(
      CSRF_STORAGE_KEY,
      String(token)
    );
  } else {
    window.sessionStorage.removeItem(
      CSRF_STORAGE_KEY
    );
  }
};

export const installSecureFetch = () => {
  if (typeof window === "undefined") {
    return;
  }

  /*
   * ترقیاتی ماحول میں صفحہ دوبارہ بننے پر
   * fetch کو بار بار تبدیل ہونے سے روکتا ہے۔
   */
  if (window[INSTALL_FLAG]) {
    return;
  }

  window[INSTALL_FLAG] = true;

  const nativeFetch = window.fetch.bind(
    window
  );

  window.fetch = async (
    input,
    init = {}
  ) => {
    /*
     * صرف اپنے سرور کی درخواستوں کو تبدیل کریں۔
     * دوسری ویب گاہوں کی درخواستوں کو نہ چھیڑیں۔
     */
    if (!isApiRequest(input)) {
      return nativeFetch(input, init);
    }

    const inputMethod =
      typeof Request !== "undefined" &&
      input instanceof Request
        ? input.method
        : "GET";

    const requestMethod = String(
      init.method ||
        inputMethod ||
        "GET"
    ).toUpperCase();

    const inputHeaders =
      typeof Request !== "undefined" &&
      input instanceof Request
        ? input.headers
        : undefined;

    const headers = new Headers(
      init.headers || inputHeaders
    );

    const csrfToken = getCsrfToken();

    /*
     * تبدیلی والی درخواستوں کے ساتھ
     * حفاظتی نشان شامل کریں۔
     */
    if (
      isMutation(requestMethod) &&
      csrfToken
    ) {
      headers.set(
        "X-CSRF-Token",
        csrfToken
      );
    }

    const response = await nativeFetch(
      input,
      {
        ...init,
        method: requestMethod,
        headers,
        credentials: "include",
      }
    );

    /*
     * غلط داخلے یا ابتدائی نشست کی جانچ پر
     * نشست ختم ہونے کا پیغام نہ دکھائیں۔
     */
    if (
      response.status === 401 &&
      !isPublicAuthRequest(input)
    ) {
      saveCsrfToken(null);

      dispatchAuthState(
        401,
        input
      );
    }

    return response;
  };
};