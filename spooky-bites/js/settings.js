// settings.html: notification + dark-mode-default toggles, saved instantly
// on change. Reacts to the "spookybites:auth" event from account.js.
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var prompt = $("signed-out-prompt");
  var panel = $("settings-panel");
  if (!prompt || !panel) return;

  var promptSignIn = $("prompt-sign-in");
  var errorEl = $("settings-error");
  var successEl = $("settings-success");
  var notifyToggle = $("notify-toggle");
  var darkModeToggle = $("dark-mode-toggle");

  var db = null;
  var session = null;
  var flashTimer = null;

  function flashSuccess(msg) {
    errorEl.hidden = true;
    successEl.textContent = msg;
    successEl.hidden = false;
    window.clearTimeout(flashTimer);
    flashTimer = window.setTimeout(function () { successEl.hidden = true; }, 2500);
  }

  function showError(msg) {
    successEl.hidden = true;
    errorEl.textContent = msg;
    errorEl.hidden = false;
  }

  promptSignIn.addEventListener("click", function () {
    var toggle = $("account-toggle");
    if (toggle) toggle.click();
  });

  function saveField(field, value, checkbox, previous) {
    var payload = {};
    payload[field] = value;
    db.from("profiles").update(payload).eq("id", session.user.id).then(function (res) {
      if (res.error) {
        checkbox.checked = previous;
        showError(res.error.message);
        return;
      }
      flashSuccess("Saved.");
      if (field === "dark_mode_default") {
        try {
          if (value) localStorage.setItem("spooky-bites-theme-account-default", "dark");
          else localStorage.removeItem("spooky-bites-theme-account-default");
        } catch (e) { /* ignore */ }
      }
    });
  }

  notifyToggle.addEventListener("change", function () {
    if (!db || !session) return;
    saveField("notify_new_recipes", notifyToggle.checked, notifyToggle, !notifyToggle.checked);
  });

  darkModeToggle.addEventListener("change", function () {
    if (!db || !session) return;
    saveField("dark_mode_default", darkModeToggle.checked, darkModeToggle, !darkModeToggle.checked);
  });

  document.addEventListener("spookybites:auth", function (e) {
    db = window.spookyBitesDb;
    session = e.detail.session;
    if (session) {
      prompt.hidden = true;
      panel.hidden = false;
      var profile = e.detail.profile;
      notifyToggle.checked = !profile || profile.notify_new_recipes !== false;
      darkModeToggle.checked = !!(profile && profile.dark_mode_default);
    } else {
      prompt.hidden = false;
      panel.hidden = true;
    }
  });
})();
