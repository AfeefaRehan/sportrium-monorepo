/* public/firebase-messaging-sw.js */

/* Use compat in SW for simplicity */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

/* TODO: fill these when you add Firebase config */
firebase.initializeApp({
  apiKey: "<API_KEY>",
  authDomain: "<PROJECT_ID>.firebaseapp.com",
  projectId: "<PROJECT_ID>",
  storageBucket: "<PROJECT_ID>.appspot.com",
  messagingSenderId: "<SENDER_ID>",
  appId: "<APP_ID>",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload?.notification?.title || "Match reminder";
  const body  = payload?.notification?.body  || "Kickoff soon!";
  const icon  = "/icons/icon-192.png"; // optional; keep a small icon in /public/icons
  self.registration.showNotification(title, { body, icon });
});
