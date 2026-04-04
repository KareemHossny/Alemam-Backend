const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

const AUTH_COOKIE_SCOPES = {
  admin: {
    name: "admin_session",
    path: "/api/admin",
  },
  engineer: {
    name: "engineer_session",
    path: "/api/engineer",
  },
  supervisor: {
    name: "supervisor_session",
    path: "/api/supervisor",
  },
};

const isProduction = process.env.NODE_ENV === "production" || process.env.VERCEL === "1";

const normalizeSameSite = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (["strict", "lax", "none"].includes(normalizedValue)) {
    return normalizedValue;
  }

  return null;
};

const getSameSiteValue = () =>
  normalizeSameSite(process.env.AUTH_COOKIE_SAME_SITE) || (isProduction ? "none" : "lax");

const getBaseCookieOptions = () => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: getSameSiteValue(),
});

const getAuthCookieConfig = (scope) => {
  const scopeConfig = AUTH_COOKIE_SCOPES[scope];

  if (!scopeConfig) {
    throw new Error(`Unknown auth cookie scope: ${scope}`);
  }

  return {
    name: scopeConfig.name,
    setOptions: {
      ...getBaseCookieOptions(),
      path: scopeConfig.path,
      maxAge: SESSION_DURATION_MS,
    },
    clearOptions: {
      ...getBaseCookieOptions(),
      path: scopeConfig.path,
    },
  };
};

const getAuthScopeFromRequest = (req) => {
  const routePath = req?.baseUrl || req?.originalUrl || "";

  if (routePath.startsWith("/api/admin")) {
    return "admin";
  }

  if (routePath.startsWith("/api/engineer")) {
    return "engineer";
  }

  if (routePath.startsWith("/api/supervisor")) {
    return "supervisor";
  }

  return null;
};

const getAuthCookieConfigForRequest = (req) => {
  const scope = getAuthScopeFromRequest(req);
  return scope ? getAuthCookieConfig(scope) : null;
};

const parseCookies = (cookieHeader = "") =>
  cookieHeader
    .split(";")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce((cookies, segment) => {
      const separatorIndex = segment.indexOf("=");

      if (separatorIndex === -1) {
        return cookies;
      }

      const name = segment.slice(0, separatorIndex).trim();
      const value = segment.slice(separatorIndex + 1).trim();

      if (!name) {
        return cookies;
      }

      try {
        cookies[name] = decodeURIComponent(value);
      } catch (error) {
        cookies[name] = value;
      }

      return cookies;
    }, {});

const getCookieValue = (req, cookieName) => {
  if (!req._parsedCookies) {
    req._parsedCookies = parseCookies(req.headers.cookie);
  }

  return req._parsedCookies[cookieName];
};

module.exports = {
  AUTH_COOKIE_SCOPES,
  SESSION_DURATION_MS,
  getAuthCookieConfig,
  getAuthCookieConfigForRequest,
  getAuthScopeFromRequest,
  getCookieValue,
};
