// Login page controller. On successful (and authorized) sign-in, redirect to the app.
import { onUser, signIn } from "./auth.js";

const btn = document.getElementById("signInBtn");
const errEl = document.getElementById("authError");

onUser((user, error) => {
  if (user) {
    // Signed in and authorized → go to the main app.
    location.replace("index.html");
    return;
  }
  if (error) errEl.textContent = error;
});

btn.addEventListener("click", async () => {
  errEl.textContent = "";
  btn.disabled = true;
  try {
    await signIn(); // popup (localhost) or full-page redirect (deployed)
  } catch (e) {
    errEl.textContent = e.message || String(e);
    btn.disabled = false;
  }
});
