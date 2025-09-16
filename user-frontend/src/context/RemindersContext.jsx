// src/context/RemindersContext.jsx
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { enableBackgroundPush, disableBackgroundPush, hasPushToken, onForegroundMessage } from "../lib/messaging";
import { upsertReminder, deleteReminder } from "../lib/api";

const RemindersContext = createContext(null);
const LS_KEY = "sportrium.reminders:v1";
const HOURLY_KEY = "sportrium.hourlyEnabled:v1";
const BGPUSH_KEY = "sportrium.bgPushEnabled:v1";

function load(key, fallback) {
  try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; }
  catch { return fallback; }
}
function save(key, val){ localStorage.setItem(key, JSON.stringify(val)); }

function isSameLocalDate(aISO, b = new Date()) {
  const a = new Date(aISO);
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();
}
function nextTopOfHour() {
  const now = new Date(); const d = new Date(now);
  d.setMinutes(0,0,0); d.setHours(now.getMinutes()===0 && now.getSeconds()===0 ? now.getHours() : now.getHours()+1);
  return d;
}
function timeFmt(d){ return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }

export function RemindersProvider({ children }) {
  const [reminders, setReminders] = useState(() => load(LS_KEY, []));
  const [hourlyEnabled, setHourlyEnabled] = useState(() => load(HOURLY_KEY, true));    // tab-open hourly pings
  const [bgPushEnabled, setBgPushEnabled]   = useState(() => load(BGPUSH_KEY, false)); // background push via FCM

  const intervalRef = useRef(null);
  const timeoutRef  = useRef(null);

  useEffect(()=>save(LS_KEY, reminders), [reminders]);
  useEffect(()=>save(HOURLY_KEY, hourlyEnabled), [hourlyEnabled]);
  useEffect(()=>save(BGPUSH_KEY, bgPushEnabled), [bgPushEnabled]);

  // Hourly local notifications on match day (works without backend)
  useEffect(() => {
    clearTimeout(timeoutRef.current); clearInterval(intervalRef.current);
    if (!hourlyEnabled) return;

    const todays = reminders.filter(r => isSameLocalDate(r.startISO));
    if (todays.length === 0) return;

    const notify = (title, body) => {
      if (!("Notification" in window)) return;
      if (Notification.permission === "granted") new Notification(title, { body });
    };

    const fire = () => {
      const now = new Date();
      const upcoming = todays.filter(r => new Date(r.startISO) > now);
      if (upcoming.length === 0) { clearInterval(intervalRef.current); return; }
      upcoming.forEach(r => {
        notify(`Reminder: ${r.title}`, `Kickoff at ${timeFmt(r.startISO)}${r.venue ? ` · ${r.venue}` : ""}`);
      });
    };

    // ask perm once
    if (Notification.permission === "default") Notification.requestPermission().catch(()=>{});

    const firstAt = nextTopOfHour();
    timeoutRef.current = setTimeout(() => {
      fire();
      intervalRef.current = setInterval(fire, 60 * 60 * 1000);
    }, firstAt - new Date());

    return () => { clearTimeout(timeoutRef.current); clearInterval(intervalRef.current); };
  }, [hourlyEnabled, reminders]);

  // Foreground FCM handler (optional; shows toast/alert)
  useEffect(() => {
    const off = onForegroundMessage?.((payload) => {
      // keep simple; you can wire to your toast system
      const title = payload?.notification?.title || "Match reminder";
      const body  = payload?.notification?.body  || "";
      if (Notification.permission === "granted") new Notification(title, { body });
    });
    return () => { if (typeof off === "function") off(); };
  }, []);

  const addReminder = async (r) => {
    setReminders(prev => {
      if (prev.some(x => x.id === r.id)) return prev;
      const next = [...prev, r].sort((a,b)=> new Date(a.startISO)-new Date(b.startISO));
      return next;
    });
    await upsertReminder(r);
  };
  const removeReminder = async (id) => {
    setReminders(prev => prev.filter(r => r.id !== id));
    await deleteReminder(id);
  };
  const isReminded = (id) => reminders.some(r => r.id === id);

  const toggleHourly = (on) => {
    if (on && Notification.permission === "default") {
      Notification.requestPermission().catch(()=>{});
    }
    setHourlyEnabled(on);
  };

  const toggleBgPush = async (on) => {
    if (on) {
      const token = await enableBackgroundPush();
      if (!token) { alert("Background push unavailable (configure Firebase + VAPID). Using in-tab notifications instead."); setBgPushEnabled(false); return; }
      setBgPushEnabled(true);
    } else {
      await disableBackgroundPush();
      setBgPushEnabled(false);
    }
  };

  // If token exists from a previous session but toggle false, keep UI in sync
  useEffect(() => {
    if (hasPushToken() && !bgPushEnabled) setBgPushEnabled(true);
  }, []);

  const value = useMemo(()=>({
    reminders, addReminder, removeReminder, isReminded,
    hourlyEnabled, toggleHourly,
    bgPushEnabled, toggleBgPush,
  }), [reminders, hourlyEnabled, bgPushEnabled]);

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(){ return useContext(RemindersContext); }
