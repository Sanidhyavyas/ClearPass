import axios from "axios";

import { clearAuth, getToken } from "../utils/auth";

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
    return config;
  }

  const token = getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isPublicAuthRequest(error.config?.url)) {
      clearAuth();
    }

    return Promise.reject(error);
  }
);

export default API;
