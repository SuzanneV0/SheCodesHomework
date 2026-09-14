// account.html: editable profile (avatar, display name, food preference,
// favourite Halloween character). Reacts to the "spookybites:auth" event
// dispatched by account.js rather than managing its own session state.
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var prompt = $("signed-out-prompt");
  var form = $("profile-form");
  if (!prompt || !form) return;

  var promptSignIn = $("prompt-sign-in");
  var errorEl = $("profile-error");
  var successEl = $("profile-success");
  var saveBtn = $("profile-save");
  var avatarPreview = $("avatar-preview");
  var avatarPick = $("avatar-pick");
  var avatarInput = $("avatar-input");

  var db = null;
  var session = null;

  function showError(msg) {
    errorEl.textContent = msg || "";
    errorEl.hidden = !msg;
    if (msg) successEl.hidden = true;
  }

  function showSuccess(msg) {
    successEl.textContent = msg || "";
    successEl.hidden = !msg;
    if (msg) errorEl.hidden = true;
  }

  function fillForm(profile) {
    $("display-name").value = (profile && profile.display_name) || "";
    $("food-preference").value = (profile && profile.food_preference) || "";
    $("favourite-character").value = (profile && profile.favourite_character) || "";
    avatarPreview.src = (profile && profile.avatar_url) || "favicon.svg";
  }

  promptSignIn.addEventListener("click", function () {
    var toggle = $("account-toggle");
    if (toggle) toggle.click();
  });

  avatarPick.addEventListener("click", function () {
    avatarInput.click();
  });

  avatarInput.addEventListener("change", function () {
    var file = avatarInput.files[0];
    avatarInput.value = "";
    if (!file || !db || !session) return;

    showError("");
    showSuccess("");

    if (file.size > 2 * 1024 * 1024) {
      showError("That image is over 2MB — please choose a smaller one.");
      return;
    }

    var ext = (file.name.split(".").pop() || "png").toLowerCase();
    var path = session.user.id + "/avatar." + ext;

    avatarPick.disabled = true;
    db.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type })
      .then(function (res) {
        if (res.error) { showError(res.error.message); return; }
        var publicUrl = db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
        return db.from("profiles").update({ avatar_url: publicUrl }).eq("id", session.user.id)
          .then(function (updateRes) {
            if (updateRes.error) { showError(updateRes.error.message); return; }
            avatarPreview.src = publicUrl + "?t=" + Date.now();
            showSuccess("Avatar updated.");
          });
      })
      .catch(function (err) { showError(err.message || "Could not upload that image."); })
      .then(function () { avatarPick.disabled = false; });
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!db || !session) return;
    showError("");
    showSuccess("");
    saveBtn.disabled = true;

    var payload = {
      display_name: $("display-name").value.trim() || null,
      food_preference: $("food-preference").value.trim() || null,
      favourite_character: $("favourite-character").value.trim() || null
    };

    db.from("profiles").update(payload).eq("id", session.user.id).then(function (res) {
      saveBtn.disabled = false;
      if (res.error) { showError(res.error.message); return; }
      showSuccess("Profile saved.");
    });
  });

  document.addEventListener("spookybites:auth", function (e) {
    db = window.spookyBitesDb;
    session = e.detail.session;
    if (session) {
      prompt.hidden = true;
      form.hidden = false;
      fillForm(e.detail.profile);
    } else {
      prompt.hidden = false;
      form.hidden = true;
    }
  });
})();
