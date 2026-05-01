import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDxc_UdQmAjppjT_fg3xH38qtbx6KfgxZw",
  authDomain: "lms-project-c92ea.firebaseapp.com",
  projectId: "lms-project-c92ea",
  storageBucket: "lms-project-c92ea.firebasestorage.app",
  messagingSenderId: "104546197738",
  appId: "1:104546197738:web:58b57c9650cae69fce3793"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
