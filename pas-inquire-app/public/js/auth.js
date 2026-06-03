// Firebase Auth + App Check bootstrap and the sign-in gate.
// Uses Firebase JS SDK v10 (ESM from gstatic CDN). No bundler needed.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app.js";
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult,
  signOut, onAuthStateChanged, connectAuthEmulator,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-auth.js";
import {
  initializeAppCheck, ReCaptchaEnterpriseProvider, getToken as getAppCheckToken,
} from "https://www.gstatic.com/firebasejs/10.13.2/firebase-app-check.js";

import { firebaseConfig, APP_CHECK_SITE_KEY, ALLOWED_EMAILS, ALLOWED_EMAIL_DOMAIN } from "./firebaseConfig.js";

const isLocal = ["localhost", "127.0.0.1"].includes(location.hostname);

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);

let appCheck = null;
if (isLocal) {
  // Local: use a debug token; the function skips App Check in the emulator.
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  connectAuthEmulator(auth, "http://localhost:9099", { disableWarnings: true });
}
if (APP_CHECK_SITE_KEY && APP_CHECK_SITE_KEY !== "YOUR_RECAPTCHA_ENTERPRISE_SITE_KEY") {
  try {
    appCheck = initializeAppCheck(fbApp, {
      provider: new ReCaptchaEnterpriseProvider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (e) { console.warn("App Check init failed:", e.message); }
}

function emailAllowed(email) {
  if (!email) return false;
  const e = email.toLowerCase();
  if (ALLOWED_EMAILS?.length && ALLOWED_EMAILS.map((x) => x.toLowerCase()).includes(e)) return true;
  if (ALLOWED_EMAIL_DOMAIN && e.endsWith("@" + ALLOWED_EMAIL_DOMAIN.toLowerCase())) return true;
  return !(ALLOWED_EMAILS?.length) && !ALLOWED_EMAIL_DOMAIN;
}

let currentUser = null;
let pendingRedirectError = "";

// Process the result of a redirect sign-in (surfaces errors like unauthorized-domain).
getRedirectResult(auth).catch((e) => { pendingRedirectError = e?.message || String(e); });

export function onUser(cb) {
  onAuthStateChanged(auth, (user) => {
    if (user && !emailAllowed(user.email)) {
      signOut(auth);
      cb(null, "Account " + user.email + " is not authorized for this app.");
      return;
    }
    currentUser = user;
    cb(user, user ? null : (pendingRedirectError || null));
  });
}

export async function signIn() {
  const provider = new GoogleAuthProvider();
  // Use a popup on every origin. signInWithRedirect is unreliable when the serving
  // origin (…web.app) differs from authDomain (…firebaseapp.com): browsers block the
  // cross-site storage it depends on, so the session is lost on return and the user
  // is bounced back to the login page. The popup handoff works because firebase.json
  // sets COOP "same-origin-allow-popups". Fall back to redirect only if the popup is
  // blocked or unsupported (where redirect at least has a chance of completing).
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    if (!isLocal && (e?.code === "auth/popup-blocked" || e?.code === "auth/operation-not-supported-in-this-environment")) {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw e;
  }
}

export async function signOutUser() { await signOut(auth); }

/** Headers for every /api call: Firebase ID token + (prod) App Check token. */
export async function authHeaders() {
  if (!currentUser) throw new Error("Not signed in");
  const headers = { Authorization: "Bearer " + (await currentUser.getIdToken()) };
  if (appCheck) {
    try { headers["X-Firebase-AppCheck"] = (await getAppCheckToken(appCheck, false)).token; }
    catch (e) { console.warn("App Check token error:", e.message); }
  }
  return headers;
}
