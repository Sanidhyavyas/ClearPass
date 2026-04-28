import axios from "axios";

import { clearAuth, getToken } from "../utils/auth";
import logger, { correlationId } from "../utils/logger";

const PUBLIC_AUTH_PATH_SUFFIXES = [
  "/login",
  "/register",
  "/super-admin/login",
  "/api/auth/login",
  "/api/auth/register",
  "/api/super-admin/login"
];

const getRequestPath = (url = "") => {
  if (!url) {
    return "";
  }

  try {
    return new URL(url, "http://localhost").pathname;
  } catch (error) {
    return url;
  }
};

const isPublicAuthRequest = (url) => {
  const pathname = getRequestPath(url);
  return PUBLIC_AUTH_PATH_SUFFIXES.some((suffix) => pathname.endsWith(suffix));
};

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:5000"
});

API.interceptors.request.use((config) => {
  if (isPublicAuthRequest(config.url)) {
    delete config.headers.Authorization;
  } else {
    const token = getToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }

  // Attach correlation ID so backend logs can be tied to this frontend session
  config.headers["x-request-id"] = correlationId;

  // Record start time for duration calculation
  config._startTime = Date.now();

  // Don't log the /api/logs request itself (would create infinite loop)
  if (!config.url?.includes("/api/logs")) {
    logger.logApiRequest(config.method || "get", config.url, config.data);
  }

  return config;
});

API.interceptors.response.use(
  (response) => {
    const durationMs = response.config._startTime ? Date.now() - response.config._startTime : null;
    if (!response.config.url?.includes("/api/logs")) {
      logger.logApiResponse(
        response.config.method || "get",
        response.config.url,
        response.status,
        durationMs
      );
    }
    return response;
  },
  (error) => {
    const config     = error.config || {};
    const status     = error.response?.status;
    const durationMs = config._startTime ? Date.now() - config._startTime : null;

    if (status === 401 && !isPublicAuthRequest(config.url)) {
      clearAuth();
    }

    if (!config.url?.includes("/api/logs")) {
      logger.logApiError(
        config.method || "unknown",
        config.url    || "unknown",
        status        || 0,
        error.message
      );
    }

    // Attach durationMs for optional upstream use
    if (error.response) error.response._durationMs = durationMs;

    return Promise.reject(error);
  }
);

export default API;

