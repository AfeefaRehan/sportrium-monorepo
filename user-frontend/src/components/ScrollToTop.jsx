import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Scrolls the window to the very top whenever the route changes.
 * Works for both pathname and querystring changes.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // jump immediately; use { behavior: "smooth" } if you want animation
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [pathname, search]);

  return null;
}
