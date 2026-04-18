const AUTH_STORAGE_KEY = "clearpass_auth";

export function saveAuth(payload) {
  const authState = {
    token: payload.token,
    user: payload.user || {
      role: payload.role
    }
  };

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  localStorage.setItem("token", authState.token);
  localStorage.setItem("role", authState.user?.role || "");
}

export function getAuth() {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);

    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    clearAuth();
  }

  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) {
    return null;
  }

  return {
    token,
    user: role ? { role } : null
  };
}

export function clearAuth() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("role");
}

export function getToken() {
  return getAuth()?.token || "";
}

export function getRole(explicitRole) {
  if (explicitRole) {
    return explicitRole;
  }

  return getAuth()?.user?.role || localStorage.getItem("role") || "";
}

export function getDefaultRoute(explicitRole) {
  const role = getRole(explicitRole);

  if (role === "student") {
    return "/student";
  }

  if (role === "teacher") {
    return "/teacher";
  }

  if (role === "admin") {
    return "/admin";
  }

  if (role === "super_admin") {
    return "/super-admin";
  }

  return "/login";
}
