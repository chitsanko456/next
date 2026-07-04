import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAj6eXQlZBu2ow6_r2B6NnWgOHyNMRXd7g",
  authDomain: "resolute-adapter-mlll2.firebaseapp.com",
  projectId: "resolute-adapter-mlll2",
  storageBucket: "resolute-adapter-mlll2.firebasestorage.app",
  messagingSenderId: "776663952078",
  appId: "1:776663952078:web:e2a955ada31cb9f7dffe9f"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID provided in the configuration
export const db = getFirestore(app, "ai-studio-pharmacyposinven-c84cb69a-e934-4e32-86fd-604401579e1b");

// Initialize Firebase Auth
export const auth = getAuth(app);
