// Copy this file to `firebaseConfig.js` and fill in your project's web config.
// These values are NOT secrets (Firebase web config is public by design), but
// they are project-specific, so the real file is git-ignored.
//
// Find them in: Firebase console -> Project settings -> Your apps -> Web app -> SDK setup.
//
// APP_CHECK_SITE_KEY is your reCAPTCHA Enterprise site key (App Check provider).
// Leave it as "" when running only against the local emulator with a debug token.

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  appId: "YOUR_APP_ID",
};

export const APP_CHECK_SITE_KEY = "YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY";

// Restrict who may sign in. Empty array = allow any signed-in Google account.
// Example: ["jane@evicore.com"] or use ALLOWED_EMAIL_DOMAIN below.
export const ALLOWED_EMAILS = [];
export const ALLOWED_EMAIL_DOMAIN = ""; // e.g. "evicore.com"
