// Visitor sign-in (Google + email/password) via Supabase, so people can
// save favourite recipes to their own account. Signing in creates a
// "profiles" row for them (role="user") via the ensure_profile() RPC —
// callers can never set their own role, so this can't be used to grant
// admin access.
(function () {
  "use strict";

  var SUPABASE_URL = "https://itwsbzoampkxwdmtwvoo.supabase.co";
  var SUPABASE_KEY = "sb_publishable_lCvhYp63BsUFFS4vrcwG-Q_0iJLFCDX";

  if (typeof window.supabase === "undefined") return;

  var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  window.spookyBitesDb = db; // shared client for favourites.js

  var $ = function (id) { return document.getElementById(id); };
  var toggleBtn = $("account-toggle");
  var modal = $("account-modal");
  if (!toggleBtn || !modal) return;

  var form = $("account-form");
  var googleBtn = $("account-google");
  var errorEl = $("account-error");
  var closeBtn = $("account-close");
  var modeToggle = $("account-mode-toggle");
  var modeText = $("account-mode-text");
  var submitBtn = $("account-submit");
  var mode = "signin";

  function openModal() {
    modal.hidden = false;
    var first = modal.querySelector("input");
    if (first) first.focus();
  }

  function closeModal() {
    modal.hidden = true;
  }

  function showError(msg) {
    errorEl.textContent = msg || "";
    errorEl.hidden = !msg;
  }

  function setMode(m) {
    mode = m;
    submitBtn.textContent = m === "signup" ? "Create account" : "Sign in";
    modeText.textContent = m === "signup" ? "Already have an account?" : "New here?";
    modeToggle.textContent = m === "signup" ? "Sign in" : "Create an account";
    showError("");
  }

  toggleBtn.addEventListener("click", function () {
    if (toggleBtn.getAttribute("data-signed-in") === "true") {
      db.auth.signOut();
      return;
    }
    setMode("signin");
    form.reset();
    openModal();
  });

  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) {
    if (e.target === modal) closeModal();
  });
  modeToggle.addEventListener("click", function () {
    setMode(mode === "signup" ? "signin" : "signup");
  });

  googleBtn.addEventListener("click", function () {
    showError("");
    db.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href.split("#")[0].split("?")[0] }
    }).then(function (res) {
      if (res.error) showError(res.error.message);
    });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    showError("");
    var email = $("account-email").value.trim();
    var password = $("account-password").value;
    submitBtn.disabled = true;

    var op = mode === "signup"
      ? db.auth.signUp({ email: email, password: password })
      : db.auth.signInWithPassword({ email: email, password: password });

    op.then(function (res) {
      submitBtn.disabled = false;
      if (res.error) { showError(res.error.message); return; }
      if (mode === "signup" && !res.data.session) {
        showError("Check your email to confirm your account, then sign in.");
        setMode("signin");
        return;
      }
      closeModal();
      // a session triggers onAuthStateChange -> render()
    }).catch(function (err) {
      submitBtn.disabled = false;
      showError(err.message || "Something went wrong.");
    });
  });

  function render(session) {
    if (session) {
      toggleBtn.setAttribute("data-signed-in", "true");
      toggleBtn.textContent = "Sign out";
      toggleBtn.setAttribute("aria-label", "Sign out of Spooky Bites");
      db.rpc("ensure_profile"); // fire-and-forget: creates the profile row (role="user") if missing
    } else {
      toggleBtn.setAttribute("data-signed-in", "false");
      toggleBtn.textContent = "Sign in";
      toggleBtn.setAttribute("aria-label", "Sign in to Spooky Bites");
    }
  }

  db.auth.onAuthStateChange(function (_event, session) { render(session); });
  db.auth.getSession().then(function (res) { render(res.data.session); });
})();
