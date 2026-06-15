import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC2X3Ato1hQWCaMD2AyYoDPdmVbrK4owro",
  authDomain: "ludo-lovable-foda.firebaseapp.com",
  projectId: "ludo-lovable-foda",
  storageBucket: "ludo-lovable-foda.firebasestorage.app",
  messagingSenderId: "150903761722",
  appId: "1:150903761722:web:4c91095e7caa88e5f03e03"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, { ignoreUndefinedProperties: true });
