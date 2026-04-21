import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBsH0thsRXAti-gbnsJLpIAMroe7PTyL2I",
  authDomain: "deadclanbb-1f05e.firebaseapp.com",
  databaseURL: "https://deadclanbb-1f05e-default-rtdb.firebaseio.com",
  projectId: "deadclanbb-1f05e",
  storageBucket: "deadclanbb-1f05e.firebasestorage.app",
  messagingSenderId: "208227509819",
  appId: "1:208227509819:web:ca440d6a17cebd901a5e1e",
  measurementId: "G-Z1DZW09YFS",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);
export default app;
