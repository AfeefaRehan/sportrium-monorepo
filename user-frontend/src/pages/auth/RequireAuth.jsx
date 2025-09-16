// src/pages/auth/RequireAuth.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

export default function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Auth state resolve hone tak wait — flicker/false redirect se bachne ke liye
  if (loading) return null; // (yahan spinner dikhana ho to dikha sakti ho)

  // Not logged in → /login (with 'from' so we can send the user back after login)
  if (!user) {
    const from =
      (location.pathname || "/") +
      (location.search || "") +
      (location.hash || "");
    return <Navigate to="/login" replace state={{ from }} />;
  }

  // Logged in → allow
  return children;
}
