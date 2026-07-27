import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD97kZ5nbdb3Y2x8D4mCSLwv-ldIz61PkQ",
  authDomain: "server-storage-2027.firebaseapp.com",
  projectId: "server-storage-2027",
  messagingSenderId: "32146521208",
  appId: "1:32146521208:web:6ca69a20eb70e2abac418d",
  measurementId: "G-ZHT08576S6"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export default app;
