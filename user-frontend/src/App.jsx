// src/App.jsx
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/layout/Layout";
import "./buttons.css";

// pages
import Splash from "./pages/Splash";
import Home from "./pages/Home";
import Live from "./pages/Live";
import TermsConditions from "./pages/TermsConditions";
import Contact from "./pages/Contact";
import Privacy from "./pages/Privacy";
import CityPage from "./pages/CityPage";
import NewsPage from "./pages/NewsPage";
import Schedule from "./pages/Schedule.jsx";
import About from "./pages/About";
import Services from "./pages/Services";
import Sports101 from "./pages/Sports101";
import Reminders from "./pages/Reminders";
import TicketCheckout from "@/pages/tickets/Checkout.jsx";
import ProtectedRoute from "@/components/routing/ProtectedRoute.jsx";
import Teams from "@/pages/Teams";
import NewEvent from "@/pages/host/NewEvent.jsx";
import EventDetails from "@/pages/events/EventDetails.jsx";
import ProfilePage from "@/pages/profile/ProfilePage.jsx";

// auth
import Login from "@/pages/auth/Login";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import SignUp from "./pages/auth/SignUp.jsx";
import Preferences from "./pages/onboarding/Preferences.jsx";
import Create from "@/pages/Create";
import Host from "@/pages/Host";
import RequireAuth from "@/pages/auth/RequireAuth.jsx";

// styles
import "@/styles/overrides.css";

// 🧩 Chatbot
import ChatbotWidget from "@/components/chat/ChatbotWidget.jsx";

/* -------------------- Scroll to top on route change -------------------- */
function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  // disable browser scroll restoration
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      const prev = window.history.scrollRestoration;
      window.history.scrollRestoration = "manual";
      return () => (window.history.scrollRestoration = prev);
    }
  }, []);

  useEffect(() => {
    // let in-page anchors behave normally
    if (hash) return;

    const scrollAll = () => {
      // 1) Window/document
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {}
      const doc =
        document.scrollingElement ||
        document.documentElement ||
        document.body;
      if (doc) doc.scrollTop = 0;

      // 2) Common app containers (Layout often uses one of these)
      const candidates = [
        document.querySelector("[data-scroll-root]"),
        document.querySelector("#app-main"),
        document.querySelector(".app-main"),
        document.querySelector("main"),
        document.querySelector(".content"),
        document.querySelector(".page"),
        // any explicitly marked scroll containers
        ...Array.from(
          document.querySelectorAll("[data-scroll], .scroll-container")
        ),
      ].filter(Boolean);

      candidates.forEach((el) => {
        if (el.scrollTo) {
          el.scrollTo({ top: 0, left: 0, behavior: "auto" });
        } else {
          el.scrollTop = 0;
        }
      });
    };

    // run a couple of times to outlast layout shifts
    requestAnimationFrame(scrollAll);
    setTimeout(scrollAll, 0);
    setTimeout(scrollAll, 120);
  }, [pathname, search, hash]);

  return null;
}

/* ----------------- Global overlays (chatbot, etc.) ------------------ */
function GlobalOverlays() {
  const { pathname } = useLocation();

  // Hide chatbot on specific routes
  const hideChatbot =
    pathname.startsWith("/tickets/checkout") ||
    pathname === "/splash" ||
    pathname === "/login" ||
    pathname === "/signup";

  return <>{!hideChatbot && <ChatbotWidget />}</>;
}

/* ------------------------------ 404 page ------------------------------- */
function NotFound() {
  return (
    <div style={{ padding: 24 }}>
      <h2>404 — Page not found</h2>
      <p>The page you’re looking for doesn’t exist.</p>
    </div>
  );
}

/* --------------------------------- App --------------------------------- */
export default function App() {
  const basename = import.meta.env.BASE_URL || "/";

  return (
    <BrowserRouter basename={basename}>
      <ScrollToTop />
      <Routes>
        {/* Standalone auth/onboarding (no Layout) */}
        <Route path="splash" element={<Splash />} />
        <Route path="login" element={<Login />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="forgot" element={<ForgotPassword />} />
        <Route path="onboarding/preferences" element={<Preferences />} />

        {/* All normal pages wrapped with Layout */}
        <Route path="/" element={<Layout />}>
          {/* Home */}
          <Route index element={<Home />} />

          {/* Host & Events */}
          <Route path="host" element={<Host />} />
          <Route
            path="host/new"
            element={
              <RequireAuth>
                <NewEvent />
              </RequireAuth>
            }
          />
          <Route path="events/:slug" element={<EventDetails />} />

          {/* Core pages */}
          <Route path="live" element={<Live />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="create" element={<Create />} />

          {/* Profile */}
          <Route path="profile" element={<ProfilePage />} />

          {/* Legal / misc */}
          <Route path="terms-and-conditions" element={<TermsConditions />} />
          <Route path="terms" element={<TermsConditions />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="city/:slug" element={<CityPage />} />
          <Route path="news/:id" element={<NewsPage />} />
          <Route path="services" element={<Services />} />
          <Route path="sports-101" element={<Sports101 />} />
          <Route path="about" element={<About />} />

          {/* Explore Teams */}
          <Route path="explore-teams" element={<Teams />} />
          <Route path="explore-teams/:sport" element={<Teams />} />

          {/* Checkout */}
          <Route
            path="tickets/checkout"
            element={
              <ProtectedRoute>
                <TicketCheckout />
              </ProtectedRoute>
            }
          />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>

      {/* global overlays should live outside <Routes> so they persist across pages */}
      <GlobalOverlays />
    </BrowserRouter>
  );
}
