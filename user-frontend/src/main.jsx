import React from "react";
import ReactDOM from "react-dom/client";

/* Load styles in this order */
import "./styles/tokens.css";  // variables (the only place we define them)
import "./common.css";         // base/reset
// buttons that use the tokens
import "./styles/layout.css";  // page/layout rules (no tokens here)
import "./buttons.css";
import "./styles/overrides.css";

import App from "./App.jsx";

// ✅ providers
import { AuthProvider } from "./context/AuthContext.jsx";
import { NotificationsProvider } from "./context/NotificationsContext.jsx";
/* ➕ NEW: Reminders provider */
import { RemindersProvider } from "./context/RemindersContext.jsx";

// TEMP: force light once (remove after verifying)
localStorage.removeItem("theme");
localStorage.setItem("theme", "light");

/* Default to LIGHT unless the user saved Dark */
const saved = localStorage.getItem("theme") || "light";
document.documentElement.setAttribute("data-theme", saved);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      {/* ➕ NEW: wrap app (and notifications) with reminders */}
      <RemindersProvider>
        <NotificationsProvider>
          <App />
        </NotificationsProvider>
      </RemindersProvider>
    </AuthProvider>
  </React.StrictMode>
);
