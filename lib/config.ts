function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// NEXT_PUBLIC_ vars must be accessed as literal `process.env.NAME` (not a
// dynamic `process.env[name]`) so Next.js can statically inline them into
// the browser bundle — dynamic access only works server-side.
function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const firebaseClientConfig = {
  apiKey: requirePublicEnv(
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  ),
  authDomain: requirePublicEnv(
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  ),
  projectId: requirePublicEnv(
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  ),
  storageBucket: requirePublicEnv(
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  ),
  appId: requirePublicEnv(
    "NEXT_PUBLIC_FIREBASE_APP_ID",
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  ),
};

export const RESERVATION_TTL_MINUTES = Number(
  process.env.RESERVATION_TTL_MINUTES ?? "30"
);

export const MAX_TICKETS_PER_ORDER = Number(
  process.env.MAX_TICKETS_PER_ORDER ?? "50"
);

export const MIN_DONATION_CENTS = Number(
  process.env.MIN_DONATION_CENTS ?? "500"
);

// Pix receiving details moved to lib/settings.ts (getPixConfig /
// getPixReceiverInfo), stored in Firestore instead of env vars so the admin
// can set/change them from /admin/configuracoes without a redeploy.

export function getAdminPasswordHash(): string {
  return requireEnv("ADMIN_PASSWORD_HASH");
}

export function getSessionSecret(): string {
  return requireEnv("SESSION_SECRET");
}

export function getCronSecret(): string {
  return requireEnv("CRON_SECRET");
}

// WhatsApp contact number moved to config/raffle (RaffleConfig.whatsappNumber),
// editable by the admin from /admin/configuracoes instead of a fixed env var.

export { requireEnv };
