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

  var THEME_KEY = "spooky-bites-theme";
  var THEME_DEFAULT_KEY = "spooky-bites-theme-account-default";
  var profileLink = $("profile-link");
  var settingsLink = $("settings-link");

  function applyAccountThemeDefault(darkModeDefault) {
    try {
      if (darkModeDefault) localStorage.setItem(THEME_DEFAULT_KEY, "dark");
      else localStorage.removeItem(THEME_DEFAULT_KEY);
      // Only take effect live if this device has no explicit theme choice of its own.
      if (darkModeDefault && !localStorage.getItem(THEME_KEY)) {
        document.documentElement.setAttribute("data-theme", "dark");
        var themeToggle = $("theme-toggle");
        if (themeToggle) {
          themeToggle.textContent = "☀️";
          themeToggle.setAttribute("aria-label", "Switch to light mode");
        }
      }
    } catch (e) {
      /* storage unavailable — theme just won't carry over from the account */
    }
  }

  function broadcast(session, profile) {
    window.spookyBitesProfile = profile || null;
    document.dispatchEvent(new CustomEvent("spookybites:auth", {
      detail: { session: session, profile: profile || null }
    }));
  }

  function render(session) {
    if (session) {
      toggleBtn.setAttribute("data-signed-in", "true");
      toggleBtn.textContent = "Sign out";
      toggleBtn.setAttribute("aria-label", "Sign out of Spooky Bites");
      if (profileLink) profileLink.hidden = false;
      if (settingsLink) settingsLink.hidden = false;

      db.rpc("ensure_profile").then(function (res) {
        if (res.error) { broadcast(session, null); return; }
        applyAccountThemeDefault(res.data && res.data.dark_mode_default);
        broadcast(session, res.data);
      });
    } else {
      toggleBtn.setAttribute("data-signed-in", "false");
      toggleBtn.textContent = "Sign in";
      toggleBtn.setAttribute("aria-label", "Sign in to Spooky Bites");
      if (profileLink) profileLink.hidden = true;
      if (settingsLink) settingsLink.hidden = true;
      broadcast(null, null);
    }
  }

  db.auth.onAuthStateChange(function (_event, session) { render(session); });
  db.auth.getSession().then(function (res) { render(res.data.session); });
})();
