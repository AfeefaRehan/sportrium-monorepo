import { createContext, useContext, useMemo, useState } from "react";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const [items] = useState([
    { id: 1, text: "Welcome to Sportrium!" },
    { id: 2, text: "Your account is set up." },
  ]);
  const [unread, setUnread] = useState(items.length);

  const markAllRead = () => setUnread(0);

  const value = useMemo(() => ({ items, unread, markAllRead }), [items, unread]);

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within provider");
  return ctx;
}
