// "Save to favourites" toggle, present wherever a [data-fav-slug] button is.
// Signed-out visitors get a plain localStorage list, same as before.
// Signed-in visitors (see account.js) get it synced to their own account
// via Supabase, so it follows them across devices.
(function () {
  "use strict";

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll("[data-fav-slug]")
  );
  if (!buttons.length) return;

  var STORAGE_KEY = "spooky-bites-favourites";

  function loadLocal() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveLocal(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      /* storage unavailable — favourites just won't persist */
    }
  }

  /* screen-reader announcements */
  var status = document.createElement("p");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  document.body.appendChild(status);
  function announce(msg) {
    status.textContent = "";
    status.textContent = msg;
  }

  function setPressed(btn, on) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    var heart = btn.querySelector(".fav-heart");
    if (heart) heart.textContent = on ? "♥" : "♡";
    var text = btn.querySelector(".fav-btn-text");
    if (text) text.textContent = on ? "Saved to favourites" : "Save to my favourites";
  }

  function renderFromList(list) {
    buttons.forEach(function (btn) {
      setPressed(btn, list.indexOf(btn.getAttribute("data-fav-slug")) !== -1);
    });
  }

  /* ---- signed-out: localStorage only (original behaviour) ---- */
  function toggleLocal(btn) {
    var slug = btn.getAttribute("data-fav-slug");
    var list = loadLocal();
    var i = list.indexOf(slug);
    if (i === -1) {
      list.push(slug);
      setPressed(btn, true);
      announce("Saved to your favourites.");
    } else {
      list.splice(i, 1);
      setPressed(btn, false);
      announce("Removed from your favourites.");
    }
    saveLocal(list);
  }

  /* ---- signed-in: synced to the visitor's account in Supabase ---- */
  var db = window.spookyBitesDb;
  var session = null;
  var recipeIdBySlug = {};

  function recipeIdFor(slug) {
    if (recipeIdBySlug[slug]) return Promise.resolve(recipeIdBySlug[slug]);
    return db.from("recipes").select("id").eq("slug", slug).single().then(function (res) {
      if (res.data) recipeIdBySlug[slug] = res.data.id;
      return res.data ? res.data.id : null;
    });
  }

  function loadRemoteSlugs() {
    return db.from("user_favourites").select("recipes(slug)").then(function (res) {
      if (res.error) return [];
      return (res.data || [])
        .map(function (row) { return row.recipes && row.recipes.slug; })
        .filter(Boolean);
    });
  }

  function toggleRemote(btn) {
    var slug = btn.getAttribute("data-fav-slug");
    var wasOn = btn.getAttribute("aria-pressed") === "true";
    recipeIdFor(slug).then(function (recipeId) {
      if (!recipeId) return;
      var op = wasOn
        ? db.from("user_favourites").delete().eq("user_id", session.user.id).eq("recipe_id", recipeId)
        : db.from("user_favourites").insert({ user_id: session.user.id, recipe_id: recipeId });
      op.then(function (res) {
        if (res.error) { announce(res.error.message); return; }
        setPressed(btn, !wasOn);
        announce(wasOn ? "Removed from your favourites." : "Saved to your favourites.");
      });
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (session) toggleRemote(btn); else toggleLocal(btn);
    });
  });

  renderFromList(loadLocal());

  if (db) {
    db.auth.onAuthStateChange(function (_event, sess) {
      session = sess;
      if (session) loadRemoteSlugs().then(renderFromList);
      else renderFromList(loadLocal());
    });
    db.auth.getSession().then(function (res) {
      session = res.data.session;
      if (session) loadRemoteSlugs().then(renderFromList);
    });
  }
})();
