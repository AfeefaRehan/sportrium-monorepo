import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./layout/Layout";

import Dashboard from "./pages/Dashboard";
import Users from "./pages/Users";
import Events from "./pages/Events";
import Teams from "./pages/Teams";
import Tournaments from "./pages/Tournaments";
import Reminders from "./pages/Reminders";
import Notifications from "./pages/Notifications";
import AuditLogs from "./pages/AuditLogs";
import LoginEvents from "./pages/LoginEvents";
import Login from "./pages/Login";

import { initAuth, isLoggedIn } from "./api/session";

function RequireAuth({ children }: { children: JSX.Element }) {
  const loc = useLocation();
  if (!isLoggedIn()) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export default function App() {
  useEffect(() => { initAuth(); }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="users" element={<Users />} />
        <Route path="events" element={<Events />} />
        <Route path="teams" element={<Teams />} />
        <Route path="tournaments" element={<Tournaments />} />
        <Route path="reminders" element={<Reminders />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="login-events" element={<LoginEvents />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
