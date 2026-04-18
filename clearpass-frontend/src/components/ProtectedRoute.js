import { Navigate } from "react-router-dom";

import { getDefaultRoute, getRole, getToken } from "../utils/auth";

function ProtectedRoute({ children, allowedRole }) {
  const token = getToken();
  const role = getRole();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  if (allowedRole && !allowed.includes(role)) {
    return <Navigate to={getDefaultRoute(role)} replace />;
  }

  return children;
}

export default ProtectedRoute;
