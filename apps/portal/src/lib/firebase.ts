import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC-6lmMSwZ-Y51FufvI0I5ikxDbQTGJCNs",
  authDomain: "jewel998-config.firebaseapp.com",
  projectId: "jewel998-config",
  storageBucket: "jewel998-config.firebasestorage.app",
  messagingSenderId: "851865994921",
  appId: "1:851865994921:web:8c0283c5de7f8d62cecbb8",
  measurementId: "G-ND8MZ24EP0",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
