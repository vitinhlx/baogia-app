// src/firebase/firebaseConfig.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Replace the placeholders with your Firebase project credentials
const firebaseConfig = {
  apiKey: "AIzaSyAAKcGHBHjUEgCKEEIDtk7uHweGNfzlhos",
  authDomain: "baogianhanh-d1cef.firebaseapp.com",
  projectId: "baogianhanh-d1cef",
  storageBucket: "baogianhanh-d1cef.firebasestorage.app",
  messagingSenderId: "1004399460020",
  appId: "1:1004399460020:web:3e93e6c75233e8d40d21e1",
  measurementId: "G-YD53HTYXVK"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
