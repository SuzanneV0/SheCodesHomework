/* Spooky Bites admin app.
   Auth + CRUD over the Supabase project. Uses the publishable key only;
   every table is protected by RLS ("Admins manage ...") so a non-admin
   session sees nothing. */
(function () {
  "use strict";

  var SUPABASE_URL = "https://itwsbzoampkxwdmtwvoo.supabase.co";
  var SUPABASE_KEY = "sb_publishable_lCvhYp63BsUFFS4vrcwG-Q_0iJLFCDX";

  if (typeof window.supabase === "undefined") {
    document.body.innerHTML =
      '<div class="auth"><h1>Couldn’t load</h1><p class="sub">The Supabase library failed to load from the CDN. Check your connection and refresh.</p></div>';
    return;
  }

  var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  var $ = function (id) { return document.getElementById(id); };
  var state = { subscribers: [], recipes: [], favourites: [], mode: "signin" };
  var filters = {
    subsQ: "", subsStatus: "",
    recipesQ: "", recipesCat: "", recipesDiff: "",
    favesQ: ""
  };

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtDate(s) {
    if (!s) return "";
    var d = new Date(s);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function authMsg(text) {
    var el = $("auth-msg");
    if (!text) { el.classList.add("hidden"); return; }
    el.textContent = text;
    el.classList.remove("hidden");
  }

  function appMsg(text, kind) {
    var el = $("app-msg");
    if (!text) { el.classList.add("hidden"); return; }
    el.textContent = text;
    el.className = "msg " + (kind || "ok");
    el.classList.remove("hidden");
    if (kind !== "error") {
      window.clearTimeout(appMsg._t);
      appMsg._t = window.setTimeout(function () { el.classList.add("hidden"); }, 3500);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Auth                                                               */
  /* ------------------------------------------------------------------ */
  function setAuthMode(mode) {
    state.mode = mode;
    var signup = mode === "signup";
    $("auth-submit").textContent = signup ? "Create account" : "Sign in";
    $("auth-password").setAttribute("autocomplete", signup ? "new-password" : "current-password");
    $("auth-toggle-text").textContent = signup ? "Already set up?" : "No account yet?";
    $("auth-toggle").textContent = signup ? "Sign in" : "Create the admin account";
    authMsg("");
  }

  $("auth-toggle").addEventListener("click", function () {
    setAuthMode(state.mode === "signup" ? "signin" : "signup");
  });

  $("auth-form").addEventListener("submit", function (e) {
    e.preventDefault();
    authMsg("");
    var email = $("auth-email").value.trim();
    var password = $("auth-password").value;
    var btn = $("auth-submit");
    btn.disabled = true;

    var op = state.mode === "signup"
      ? db.auth.signUp({ email: email, password: password })
      : db.auth.signInWithPassword({ email: email, password: password });

    op.then(function (res) {
      btn.disabled = false;
      if (res.error) { authMsg(res.error.message); return; }
      if (state.mode === "signup" && !res.data.session) {
        authMsg("Account created. Confirm your email address, then sign in. " +
                "(Or turn off “Confirm email” in the Supabase Auth settings.)");
        setAuthMode("signin");
      }
      // a session triggers onAuthStateChange -> route()
    }).catch(function (err) {
      btn.disabled = false;
      authMsg(err.message || "Something went wrong.");
    });
  });

  $("signout").addEventListener("click", function () {
    db.auth.signOut();
  });

  db.auth.onAuthStateChange(function (_event, session) {
    route(session);
  });

  function route(session) {
    if (!session) {
      $("app-view").classList.add("hidden");
      $("auth-view").classList.remove("hidden");
      return;
    }
    // Signed in — make sure this account is the admin.
    db.rpc("claim_admin").then(function (res) {
      if (res.error) {
        // e.g. panel already claimed by someone else
        authMsg(res.error.message);
        db.auth.signOut();
        return;
      }
      return db.rpc("is_admin").then(function (r2) {
        if (r2.error || !r2.data) {
          authMsg("This account is not an administrator.");
          db.auth.signOut();
          return;
        }
        showApp(session);
      });
    });
  }

  function showApp(session) {
    $("auth-view").classList.add("hidden");
    $("app-view").classList.remove("hidden");
    $("who").textContent = session.user.email;
    loadAll();
  }

  /* ------------------------------------------------------------------ */
  /* Tabs                                                               */
  /* ------------------------------------------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll(".tabs button"), function (btn) {
    btn.addEventListener("click", function () {
      var tab = btn.getAttribute("data-tab");
      document.querySelectorAll(".tabs button").forEach(function (b) {
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      document.querySelectorAll(".tabpanel").forEach(function (p) {
        p.classList.toggle("hidden", p.id !== "tab-" + tab);
      });
    });
  });

  /* ------------------------------------------------------------------ */
  /* Load data                                                          */
  /* ------------------------------------------------------------------ */
  function loadAll() {
    return Promise.all([
      db.from("subscribers").select("*").order("subscribed_at", { ascending: false }),
      db.from("recipes").select("*").order("title", { ascending: true }),
      db.from("favourites").select(
        "subscriber_id, recipe_id, favourited_at, subscribers(full_name,email), recipes(title,slug)"
      ).order("favourited_at", { ascending: false })
    ]).then(function (r) {
      var err = r[0].error || r[1].error || r[2].error;
      if (err) { appMsg("Could not load data: " + err.message, "error"); return; }
      state.subscribers = r[0].data || [];
      state.recipes = r[1].data || [];
      state.favourites = r[2].data || [];
      renderSummary();
      renderSubscribers();
      renderRecipes();
      renderFavourites();
    });
  }

  function favCountBy(key, id) {
    return state.favourites.filter(function (f) { return f[key] === id; }).length;
  }

  /* ------------------------------------------------------------------ */
  /* Search + filter                                                    */
  /* ------------------------------------------------------------------ */
  function has(text, q) {
    return !q || String(text).toLowerCase().indexOf(q.toLowerCase()) !== -1;
  }

  function filteredSubs() {
    return state.subscribers.filter(function (s) {
      var okQ = has(s.full_name + " " + s.email, filters.subsQ);
      var okS = !filters.subsStatus ||
        (filters.subsStatus === "active" ? s.is_active : !s.is_active);
      return okQ && okS;
    });
  }

  function filteredRecipes() {
    return state.recipes.filter(function (r) {
      var okQ = has([r.title, r.slug, r.category, r.description].join(" "), filters.recipesQ);
      var okC = !filters.recipesCat || r.category === filters.recipesCat;
      var okD = !filters.recipesDiff || r.difficulty === filters.recipesDiff;
      return okQ && okC && okD;
    });
  }

  function filteredFaves() {
    return state.favourites.filter(function (f) {
      var who = f.subscribers ? f.subscribers.full_name + " " + f.subscribers.email : "";
      var what = f.recipes ? f.recipes.title + " " + f.recipes.slug : "";
      return has(who + " " + what, filters.favesQ);
    });
  }

  function countLabel(shown, total) {
    return shown === total ? total + " total" : "Showing " + shown + " of " + total;
  }

  function wireFilters() {
    $("subs-search").addEventListener("input", function () {
      filters.subsQ = this.value.trim();
      renderSubscribers();
    });
    $("subs-status").addEventListener("change", function () {
      filters.subsStatus = this.value;
      renderSubscribers();
    });
    $("recipes-search").addEventListener("input", function () {
      filters.recipesQ = this.value.trim();
      renderRecipes();
    });
    $("recipes-cat-filter").addEventListener("change", function () {
      filters.recipesCat = this.value;
      renderRecipes();
    });
    $("recipes-diff-filter").addEventListener("change", function () {
      filters.recipesDiff = this.value;
      renderRecipes();
    });
    $("faves-search").addEventListener("input", function () {
      filters.favesQ = this.value.trim();
      renderFavourites();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Summary                                                            */
  /* ------------------------------------------------------------------ */
  function renderSummary() {
    var active = state.subscribers.filter(function (s) { return s.is_active; }).length;
    var cards = [
      ["Subscribers", state.subscribers.length],
      ["Active", active],
      ["Recipes", state.recipes.length],
      ["Favourites", state.favourites.length]
    ];
    $("summary-cards").innerHTML = cards.map(function (c) {
      return '<div class="card"><div class="n">' + c[1] + '</div><div class="l">' + c[0] + "</div></div>";
    }).join("");

    var counts = state.recipes.map(function (r) {
      return { title: r.title, n: favCountBy("recipe_id", r.id) };
    }).sort(function (a, b) { return b.n - a.n; }).slice(0, 5);
    $("summary-top").innerHTML = counts.length
      ? counts.map(function (c) {
          return "<li>" + esc(c.title) + ' <span class="muted">— ' + c.n + "</span></li>";
        }).join("")
      : '<li class="muted">No favourites yet.</li>';

    var recent = state.subscribers.slice(0, 5);
    $("summary-recent").innerHTML = recent.length
      ? recent.map(function (s) {
          return "<li>" + esc(s.full_name) + ' <span class="muted">— ' + fmtDate(s.subscribed_at) + "</span></li>";
        }).join("")
      : '<li class="muted">No subscribers yet.</li>';
  }

  /* ------------------------------------------------------------------ */
  /* Subscribers CRUD                                                   */
  /* ------------------------------------------------------------------ */
  function renderSubscribers() {
    var tbody = $("subs-table").querySelector("tbody");
    var rows = filteredSubs();
    $("subs-count").textContent = countLabel(rows.length, state.subscribers.length);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty">' +
        (state.subscribers.length ? "No subscribers match." : "No subscribers.") + "</td></tr>";
      return;
    }
    tbody.innerHTML = rows.map(function (s) {
      return "<tr>" +
        "<td>" + esc(s.full_name) + "</td>" +
        "<td>" + esc(s.email) + "</td>" +
        '<td><span class="pill ' + (s.is_active ? "on" : "off") + '">' +
          (s.is_active ? "active" : "inactive") + "</span></td>" +
        "<td>" + fmtDate(s.subscribed_at) + "</td>" +
        "<td>" + favCountBy("subscriber_id", s.id) + "</td>" +
        '<td class="actions">' +
          '<button class="btn ghost small" data-edit-sub="' + s.id + '">Edit</button>' +
          '<button class="btn danger small" data-del-sub="' + s.id + '">Delete</button>' +
        "</td></tr>";
    }).join("");

    tbody.querySelectorAll("[data-edit-sub]").forEach(function (b) {
      b.addEventListener("click", function () { editSub(Number(b.getAttribute("data-edit-sub"))); });
    });
    tbody.querySelectorAll("[data-del-sub]").forEach(function (b) {
      b.addEventListener("click", function () { deleteSub(Number(b.getAttribute("data-del-sub"))); });
    });
  }

  function resetSubForm() {
    $("subs-id").value = "";
    $("subs-name").value = "";
    $("subs-email").value = "";
    $("subs-active").checked = true;
    $("subs-editor-title").textContent = "Add a subscriber";
    $("subs-save").textContent = "Add subscriber";
  }

  function editSub(id) {
    var s = state.subscribers.find(function (x) { return x.id === id; });
    if (!s) return;
    $("subs-id").value = s.id;
    $("subs-name").value = s.full_name;
    $("subs-email").value = s.email;
    $("subs-active").checked = s.is_active;
    $("subs-editor-title").textContent = "Edit subscriber";
    $("subs-save").textContent = "Save changes";
    $("subs-name").focus();
  }

  function deleteSub(id) {
    var s = state.subscribers.find(function (x) { return x.id === id; });
    if (!s || !window.confirm('Delete "' + s.email + '" and all their favourites?')) return;
    db.from("subscribers").delete().eq("id", id).then(function (res) {
      if (res.error) { appMsg(res.error.message, "error"); return; }
      appMsg("Subscriber deleted.");
      loadAll();
    });
  }

  $("subs-cancel").addEventListener("click", resetSubForm);

  $("subs-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var payload = {
      full_name: $("subs-name").value.trim(),
      email: $("subs-email").value.trim().toLowerCase(),
      is_active: $("subs-active").checked
    };
    var id = $("subs-id").value;
    var op = id
      ? db.from("subscribers").update(payload).eq("id", Number(id))
      : db.from("subscribers").insert(payload);
    op.then(function (res) {
      if (res.error) { appMsg(res.error.message, "error"); return; }
      appMsg(id ? "Subscriber updated." : "Subscriber added.");
      resetSubForm();
      loadAll();
    });
  });

  /* ------------------------------------------------------------------ */
  /* Recipes CRUD                                                       */
  /* ------------------------------------------------------------------ */
  function syncCategoryFilter() {
    var sel = $("recipes-cat-filter");
    var cats = state.recipes.map(function (r) { return r.category; })
      .filter(function (c, i, a) { return c && a.indexOf(c) === i; })
      .sort();
    var current = sel.value;
    sel.innerHTML = '<option value="">All categories</option>' +
      cats.map(function (c) { return "<option>" + esc(c) + "</option>"; }).join("");
    if (cats.indexOf(current) !== -1) sel.value = current;
    else filters.recipesCat = "";
  }

  function renderRecipes() {
    var tbody = $("recipes-table").querySelector("tbody");
    syncCategoryFilter();
    var rows = filteredRecipes();
    $("recipes-count").textContent = countLabel(rows.length, state.recipes.length);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="7" class="empty">' +
        (state.recipes.length ? "No recipes match." : "No recipes.") + "</td></tr>";
      return;
    }
    tbody.innerHTML = rows.map(function (r) {
      return "<tr>" +
        "<td>" + esc(r.title) + "</td>" +
        '<td><span class="muted">' + esc(r.slug) + "</span></td>" +
        "<td>" + esc(r.category) + "</td>" +
        "<td>" + esc(r.difficulty) + "</td>" +
        "<td>" + (r.prep_minutes == null ? "—" : r.prep_minutes + " min") + "</td>" +
        "<td>" + favCountBy("recipe_id", r.id) + "</td>" +
        '<td class="actions">' +
          '<button class="btn ghost small" data-edit-recipe="' + r.id + '">Edit</button>' +
          '<button class="btn danger small" data-del-recipe="' + r.id + '">Delete</button>' +
        "</td></tr>";
    }).join("");

    tbody.querySelectorAll("[data-edit-recipe]").forEach(function (b) {
      b.addEventListener("click", function () { editRecipe(Number(b.getAttribute("data-edit-recipe"))); });
    });
    tbody.querySelectorAll("[data-del-recipe]").forEach(function (b) {
      b.addEventListener("click", function () { deleteRecipe(Number(b.getAttribute("data-del-recipe"))); });
    });
  }

  function resetRecipeForm() {
    ["recipes-id", "recipes-title", "recipes-slug", "recipes-category", "recipes-prep", "recipes-desc"]
      .forEach(function (id) { $(id).value = ""; });
    $("recipes-difficulty").value = "Easy";
    $("recipes-editor-title").textContent = "Add a recipe";
    $("recipes-save").textContent = "Add recipe";
  }

  function editRecipe(id) {
    var r = state.recipes.find(function (x) { return x.id === id; });
    if (!r) return;
    $("recipes-id").value = r.id;
    $("recipes-title").value = r.title;
    $("recipes-slug").value = r.slug;
    $("recipes-category").value = r.category;
    $("recipes-difficulty").value = r.difficulty;
    $("recipes-prep").value = r.prep_minutes == null ? "" : r.prep_minutes;
    $("recipes-desc").value = r.description || "";
    $("recipes-editor-title").textContent = "Edit recipe";
    $("recipes-save").textContent = "Save changes";
    $("recipes-title").focus();
  }

  function deleteRecipe(id) {
    var r = state.recipes.find(function (x) { return x.id === id; });
    if (!r || !window.confirm('Delete "' + r.title + '"? This also removes it from everyone’s favourites.')) return;
    db.from("recipes").delete().eq("id", id).then(function (res) {
      if (res.error) { appMsg(res.error.message, "error"); return; }
      appMsg("Recipe deleted.");
      loadAll();
    });
  }

  $("recipes-cancel").addEventListener("click", resetRecipeForm);

  function slugify(v) {
    return String(v).toLowerCase().trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  $("recipes-slug").addEventListener("blur", function () {
    if (this.value.trim()) this.value = slugify(this.value);
  });

  $("recipes-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var prep = $("recipes-prep").value.trim();
    var slug = slugify($("recipes-slug").value);
    if (!slug) { appMsg("Please enter a slug (letters, numbers, hyphens).", "error"); return; }
    var payload = {
      title: $("recipes-title").value.trim(),
      slug: slug,
      category: $("recipes-category").value.trim(),
      difficulty: $("recipes-difficulty").value,
      prep_minutes: prep === "" ? null : Number(prep),
      description: $("recipes-desc").value.trim() || null
    };
    var id = $("recipes-id").value;
    var op = id
      ? db.from("recipes").update(payload).eq("id", Number(id))
      : db.from("recipes").insert(payload);
    op.then(function (res) {
      if (res.error) { appMsg(res.error.message, "error"); return; }
      appMsg(id ? "Recipe updated." : "Recipe added.");
      resetRecipeForm();
      loadAll();
    });
  });

  /* ------------------------------------------------------------------ */
  /* Favourites CRUD                                                    */
  /* ------------------------------------------------------------------ */
  function renderFavourites() {
    var tbody = $("faves-table").querySelector("tbody");
    var rows = filteredFaves();
    $("faves-count").textContent = countLabel(rows.length, state.favourites.length);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty">' +
        (state.favourites.length ? "No favourites match." : "No favourites.") + "</td></tr>";
    } else {
      tbody.innerHTML = rows.map(function (f) {
        var who = f.subscribers ? (f.subscribers.full_name + " (" + f.subscribers.email + ")") : "#" + f.subscriber_id;
        var what = f.recipes ? f.recipes.title : "#" + f.recipe_id;
        return "<tr>" +
          "<td>" + esc(who) + "</td>" +
          "<td>" + esc(what) + "</td>" +
          "<td>" + fmtDate(f.favourited_at) + "</td>" +
          '<td class="actions"><button class="btn danger small" data-del-fave="' +
            f.subscriber_id + ":" + f.recipe_id + '">Remove</button></td>' +
        "</tr>";
      }).join("");
      tbody.querySelectorAll("[data-del-fave]").forEach(function (b) {
        b.addEventListener("click", function () {
          var parts = b.getAttribute("data-del-fave").split(":");
          deleteFave(Number(parts[0]), Number(parts[1]));
        });
      });
    }

    // populate selects
    $("faves-sub").innerHTML = state.subscribers.map(function (s) {
      return '<option value="' + s.id + '">' + esc(s.email) + "</option>";
    }).join("");
    $("faves-recipe").innerHTML = state.recipes.map(function (r) {
      return '<option value="' + r.id + '">' + esc(r.title) + "</option>";
    }).join("");
  }

  function deleteFave(subId, recipeId) {
    db.from("favourites").delete().eq("subscriber_id", subId).eq("recipe_id", recipeId).then(function (res) {
      if (res.error) { appMsg(res.error.message, "error"); return; }
      appMsg("Favourite removed.");
      loadAll();
    });
  }

  $("faves-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var payload = {
      subscriber_id: Number($("faves-sub").value),
      recipe_id: Number($("faves-recipe").value)
    };
    if (!payload.subscriber_id || !payload.recipe_id) return;
    db.from("favourites").insert(payload).then(function (res) {
      if (res.error) {
        appMsg(res.error.code === "23505" ? "That favourite already exists." : res.error.message, "error");
        return;
      }
      appMsg("Favourite added.");
      loadAll();
    });
  });

  /* ------------------------------------------------------------------ */
  /* Boot                                                               */
  /* ------------------------------------------------------------------ */
  setAuthMode("signin");
  wireFilters();
  db.auth.getSession().then(function (res) { route(res.data.session); });
})();
