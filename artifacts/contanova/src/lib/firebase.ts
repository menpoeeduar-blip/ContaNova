import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBQ-sJ_eF1kJ10uwQsc6xh7kDJB7gG0WMw",
  authDomain: "menpoe-contanova.firebaseapp.com",
  projectId: "menpoe-contanova",
  storageBucket: "menpoe-contanova.firebasestorage.app",
  messagingSenderId: "951340632679",
  appId: "1:951340632679:web:2fb0404ab682cf0f17a2c2",
  measurementId: "G-CGZK4BYXPH",
};

// Evitar inicialización duplicada (útil en HMR dev)
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const analytics =
  typeof window !== "undefined" ? getAnalytics(app) : null;
