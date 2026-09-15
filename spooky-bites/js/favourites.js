// "Save to favourites" toggle, present wherever a [data-fav-slug] button is.
// Signed-out visitors are prompted to sign in (see account.js); the recipe
// they clicked is then saved to their account automatically once they do.
// Signed-in visitors get favourites synced to their account via Supabase,
// so they follow them across devices.
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
  function announce(msg, isError) {
    status.textContent = "";
    status.textContent = msg;
    if (window.spookyToast) window.spookyToast(msg, isError ? "error" : undefined);
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

  /* ---- signed-out: localStorage only (used for buttons on pages with no
     sign-in system, and to render whatever was saved before this existed) ---- */
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

  /* ---- signed-out + sign-in available: prompt to sign in, then finish the
     save once they do. Stored in localStorage (not memory) because Google
     sign-in reloads the page. ---- */
  var PENDING_KEY = "spooky-bites-pending-fav";
  var PENDING_TTL_MS = 10 * 60 * 1000;

  function setPendingFav(slug) {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify({ slug: slug, ts: Date.now() }));
    } catch (e) { /* ignore */ }
  }

  function takePendingFav() {
    var raw;
    try {
      raw = localStorage.getItem(PENDING_KEY);
      localStorage.removeItem(PENDING_KEY);
    } catch (e) { return null; }
    if (!raw) return null;
    try {
      var data = JSON.parse(raw);
      if (data && data.slug && Date.now() - data.ts < PENDING_TTL_MS) return data.slug;
    } catch (e) { /* ignore */ }
    return null;
  }

  function promptSignInToSave(btn) {
    setPendingFav(btn.getAttribute("data-fav-slug"));
    var toggle = document.getElementById("account-toggle");
    if (toggle && toggle.getAttribute("data-signed-in") === "false") {
      toggle.click();
    } else {
      toggleLocal(btn); // no sign-in system on this page — fall back as before
    }
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
        if (res.error) { announce(res.error.message, true); return; }
        setPressed(btn, !wasOn);
        announce(wasOn ? "Removed from your favourites." : "Saved to your favourites.");
      });
    });
  }

  function applyPendingFavourite() {
    var slug = takePendingFav();
    if (!slug) return Promise.resolve();
    return recipeIdFor(slug).then(function (recipeId) {
      if (!recipeId) return;
      return db.from("user_favourites").insert({ user_id: session.user.id, recipe_id: recipeId }).then(function (res) {
        if (!res.error || res.error.code === "23505") announce("Signed in — saved to your favourites.");
      });
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (session) toggleRemote(btn);
      else promptSignInToSave(btn);
    });
  });

  renderFromList(loadLocal());

  if (db) {
    function onSignedIn() {
      applyPendingFavourite().then(function () {
        loadRemoteSlugs().then(renderFromList);
      });
    }

    db.auth.onAuthStateChange(function (_event, sess) {
      session = sess;
      if (session) onSignedIn();
      else renderFromList(loadLocal());
    });
    db.auth.getSession().then(function (res) {
      session = res.data.session;
      if (session) onSignedIn();
    });
  }
})();
