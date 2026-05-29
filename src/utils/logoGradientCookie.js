const COOKIE_NAME = 'myquiz_logo_gradients';
/** 1 年；漸層偏好跨工作階段保留 */
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 365;
const LEGACY_LOCAL_STORAGE_KEY = 'myquiz-system-header-logo-gradients';

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

function setCookie(name, value, maxAgeSec) {
  if (typeof document === 'undefined') return;
  const encoded = encodeURIComponent(value);
  document.cookie = `${encodeURIComponent(name)}=${encoded}; path=/; max-age=${maxAgeSec}; SameSite=Lax`;
}

function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; SameSite=Lax`;
}

function isValidHeaderSplit(headerSplit) {
  return Boolean(
    headerSplit?.left?.backgroundImage && headerSplit?.right?.backgroundImage,
  );
}

function isValidLogoColors(logoColors) {
  return Boolean(
    logoColors?.primaryGradient?.stops?.length
    && logoColors?.secondaryGradient?.stops?.length,
  );
}

/**
 * @param {unknown} data
 * @returns {data is { logoColors: object, pageBgCss: string, headerSplit: object }}
 */
export function isValidLogoGradientPayload(data) {
  if (!data || typeof data !== 'object') return false;
  const payload = /** @type {{ logoColors?: object, pageBgCss?: string, headerSplit?: object }} */ (data);
  return (
    isValidLogoColors(payload.logoColors)
    && typeof payload.pageBgCss === 'string'
    && payload.pageBgCss.length > 0
    && isValidHeaderSplit(payload.headerSplit)
  );
}

function readLegacyLocalStoragePayload() {
  try {
    const raw = localStorage.getItem(LEGACY_LOCAL_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data?.left?.backgroundImage || !data?.right?.backgroundImage) return null;
    return {
      headerSplit: {
        left: data.left,
        right: data.right,
      },
    };
  } catch {
    return null;
  }
}

/** @returns {{ logoColors: object, pageBgCss: string, headerSplit: object } | null} */
export function readLogoGradientCookie() {
  try {
    const raw = getCookie(COOKIE_NAME);
    if (raw) {
      const data = JSON.parse(raw);
      if (isValidLogoGradientPayload(data)) return data;
    }
  } catch {
    /* fall through */
  }

  const legacy = readLegacyLocalStoragePayload();
  if (legacy?.headerSplit) {
    try {
      localStorage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  return null;
}

/**
 * @param {{ logoColors: object, pageBgCss: string, headerSplit: object }} payload
 */
export function writeLogoGradientCookie(payload) {
  if (!isValidLogoGradientPayload(payload)) return;
  try {
    setCookie(COOKIE_NAME, JSON.stringify(payload), COOKIE_MAX_AGE_SEC);
  } catch {
    /* ignore */
  }
}

export function clearLogoGradientCookie() {
  deleteCookie(COOKIE_NAME);
}
