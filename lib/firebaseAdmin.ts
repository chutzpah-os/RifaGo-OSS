import { cert, getApps, getApp, initializeApp, type App } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { requireEnv } from "@/lib/config";

function loadServiceAccount() {
  const base64 = requireEnv("FIREBASE_ADMIN_CREDENTIALS_BASE64");
  const json = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(json);
}

function getAdminApp(): App {
  if (getApps().length) return getApp();
  return initializeApp({ credential: cert(loadServiceAccount()) });
}

export const adminDb = getFirestore(getAdminApp());
