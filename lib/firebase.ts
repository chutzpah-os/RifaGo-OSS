import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseClientConfig } from "@/lib/config";

const app = getApps().length ? getApp() : initializeApp(firebaseClientConfig);

export const db = getFirestore(app);
