import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  projectId: "wokamon-cd2ec",
  appId: "1:155455530301:web:e215bb02faf3fc3de31154",
  storageBucket: "wokamon-cd2ec.firebasestorage.app",
  apiKey: "AIzaSyBPiIYgDkkwxxceWFcciwGWEdrmPmg_ALA",
  authDomain: "wokamon-cd2ec.firebaseapp.com",
  messagingSenderId: "155455530301",
  measurementId: "G-27T9NZ8T55"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
