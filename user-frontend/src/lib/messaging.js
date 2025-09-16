// src/lib/messaging.js
import { initializeApp } from "firebase/app";
import { getMessaging, isSupported, getToken, onMessage } from "firebase/messaging";
import { savePushToken, revokePushToken, getSavedPushToken } from "./api";

// Read env (if not set -> undefined)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const VAPID = import.meta.env.VITE_FIREBASE_VAPID_KEY; // public web push key

let app, messaging;

export async function ensureMessaging() {
  try {
    if (!VAPID) return null; // not configured yet
    if (!firebaseConfig?.apiKey || !firebaseConfig?.projectId) return null;
    const ok = await isSupported();
    if (!ok) return null;
    app = app || initializeApp(firebaseConfig);
    messaging = messaging || getMessaging(app);
    return messaging;
  } catch {
    return null;
  }
}

export async function registerFCMSW() {
  if (!("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", { scope: "/" });
    return reg;
  } catch {
    return null;
  }
}

export async function enableBackgroundPush() {
  const msg = await ensureMessaging();
  if (!msg) return null;

  const perm = await Notification.requestPermission();
  if (perm !== "granted") return null;

  const reg = await registerFCMSW();
  if (!reg) return null;

  const token = await getToken(msg, { vapidKey: VAPID, serviceWorkerRegistration: reg });
  if (token) await savePushToken(token);
  return token || null;
}

export async function disableBackgroundPush() {
  await revokePushToken();
  // Optional: you could also deleteToken(messaging) here
  return true;
}

export function onForegroundMessage(cb) {
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
}

export function hasPushToken() {
  return !!getSavedPushToken();
}
