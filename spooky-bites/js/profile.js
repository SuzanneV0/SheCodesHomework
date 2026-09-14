// account.html: editable profile (avatar, display name, food preference,
// favourite Halloween character), a read-only list of favourited recipes,
// tagged recipe-photo uploads, and the visitor's own recipes. Reacts to the
// "spookybites:auth" event dispatched by account.js rather than managing its
// own session state.
(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var prompt = $("signed-out-prompt");
  var content = $("profile-content");
  var form = $("profile-form");
  if (!prompt || !content || !form) return;

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  var promptSignIn = $("prompt-sign-in");
  var errorEl = $("profile-error");
  var successEl = $("profile-success");
  var saveBtn = $("profile-save");
  var avatarPreview = $("avatar-preview");
  var avatarPick = $("avatar-pick");
  var avatarInput = $("avatar-input");

  var favList = $("fav-list");
  var favEmpty = $("fav-empty");

  var photoForm = $("photo-form");
  var photoRecipeSelect = $("photo-recipe");
  var photoFile = $("photo-file");
  var photoSubmit = $("photo-submit");
  var photoError = $("photo-error");
  var photoSuccess = $("photo-success");
  var photoList = $("photo-list");

  var myRecipeForm = $("my-recipe-form");
  var myRecipeSubmit = $("my-recipe-submit");
  var myRecipeError = $("my-recipe-error");
  var myRecipeSuccess = $("my-recipe-success");
  var myRecipeList = $("my-recipe-list");

  var db = null;
  var session = null;
  var recipesLoaded = false;

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

  /* ------------------------------------------------------------------ */
  /* My Favourites (read-only)                                          */
  /* ------------------------------------------------------------------ */
  function loadFavourites() {
    return db.from("user_favourites")
      .select("recipes(title)")
      .eq("user_id", session.user.id)
      .then(function (res) {
        var rows = (res.data || []).map(function (r) { return r.recipes; }).filter(Boolean);
        favEmpty.hidden = rows.length > 0;
        favList.innerHTML = rows.map(function (r) {
          return '<li><a class="item-title" href="recipes.html">' + esc(r.title) + "</a></li>";
        }).join("");
      });
  }

  /* ------------------------------------------------------------------ */
  /* My Recipe Photos (tagged to an official recipe)                    */
  /* ------------------------------------------------------------------ */
  function loadRecipesForSelect() {
    if (recipesLoaded) return Promise.resolve();
    return db.from("recipes").select("id, title").order("title").then(function (res) {
      recipesLoaded = true;
      photoRecipeSelect.innerHTML = (res.data || []).map(function (r) {
        return '<option value="' + r.id + '">' + esc(r.title) + "</option>";
      }).join("");
    });
  }

  function storagePathFromPublicUrl(url) {
    var marker = "/recipe-photos/";
    var i = url.indexOf(marker);
    return i === -1 ? null : url.slice(i + marker.length);
  }

  function loadMyPhotos() {
    return db.from("user_recipe_photos")
      .select("id, image_url, recipes(title)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(function (res) {
        var rows = res.data || [];
        photoList.innerHTML = rows.map(function (p) {
          var title = p.recipes ? p.recipes.title : "";
          return '<li><img src="' + esc(p.image_url) + '" alt="' + esc(title) + '" />' +
            '<p class="photo-caption">' + esc(title) + '</p>' +
            '<button type="button" class="list-remove" data-del-photo="' + p.id + '" data-url="' + esc(p.image_url) + '">Remove</button></li>';
        }).join("");
        photoList.querySelectorAll("[data-del-photo]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            deletePhoto(Number(btn.getAttribute("data-del-photo")), btn.getAttribute("data-url"));
          });
        });
      });
  }

  function deletePhoto(id, url) {
    db.from("user_recipe_photos").delete().eq("id", id).eq("user_id", session.user.id).then(function (res) {
      if (res.error) { photoError.textContent = res.error.message; photoError.hidden = false; return; }
      var path = storagePathFromPublicUrl(url);
      if (path) db.storage.from("recipe-photos").remove([path]);
      loadMyPhotos();
    });
  }

  photoForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!db || !session) return;
    photoError.hidden = true;
    photoSuccess.hidden = true;

    var recipeId = Number(photoRecipeSelect.value);
    var file = photoFile.files[0];
    if (!recipeId || !file) return;

    if (file.size > 5 * 1024 * 1024) {
      photoError.textContent = "That image is over 5MB — please choose a smaller one.";
      photoError.hidden = false;
      return;
    }

    var ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    var path = session.user.id + "/" + Date.now() + "." + ext;

    photoSubmit.disabled = true;
    db.storage.from("recipe-photos").upload(path, file, { contentType: file.type })
      .then(function (res) {
        if (res.error) { photoError.textContent = res.error.message; photoError.hidden = false; return; }
        var publicUrl = db.storage.from("recipe-photos").getPublicUrl(path).data.publicUrl;
        return db.from("user_recipe_photos").insert({
          user_id: session.user.id,
          recipe_id: recipeId,
          image_url: publicUrl
        }).then(function (insertRes) {
          if (insertRes.error) { photoError.textContent = insertRes.error.message; photoError.hidden = false; return; }
          photoForm.reset();
          photoSuccess.textContent = "Photo uploaded.";
          photoSuccess.hidden = false;
          loadMyPhotos();
        });
      })
      .catch(function (err) { photoError.textContent = err.message || "Could not upload that photo."; photoError.hidden = false; })
      .then(function () { photoSubmit.disabled = false; });
  });

  /* ------------------------------------------------------------------ */
  /* My Recipes (original, own text)                                    */
  /* ------------------------------------------------------------------ */
  function loadMyRecipes() {
    return db.from("user_recipes")
      .select("id, title, body")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .then(function (res) {
        var rows = res.data || [];
        myRecipeList.innerHTML = rows.length
          ? rows.map(function (r) {
              return '<li><div><span class="item-title">' + esc(r.title) + '</span>' +
                '<div class="item-body">' + esc(r.body) + "</div></div>" +
                '<button type="button" class="list-remove" data-del-recipe="' + r.id + '">Remove</button></li>';
            }).join("")
          : '<li class="muted-note">You haven’t added any recipes yet.</li>';
        myRecipeList.querySelectorAll("[data-del-recipe]").forEach(function (btn) {
          btn.addEventListener("click", function () {
            deleteMyRecipe(Number(btn.getAttribute("data-del-recipe")));
          });
        });
      });
  }

  function deleteMyRecipe(id) {
    db.from("user_recipes").delete().eq("id", id).eq("user_id", session.user.id).then(function (res) {
      if (!res.error) loadMyRecipes();
    });
  }

  myRecipeForm.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!db || !session) return;
    myRecipeError.hidden = true;
    myRecipeSuccess.hidden = true;

    var title = $("my-recipe-title").value.trim();
    var body = $("my-recipe-body").value.trim();
    if (!title || !body) return;

    myRecipeSubmit.disabled = true;
    db.from("user_recipes").insert({ user_id: session.user.id, title: title, body: body }).then(function (res) {
      myRecipeSubmit.disabled = false;
      if (res.error) { myRecipeError.textContent = res.error.message; myRecipeError.hidden = false; return; }
      myRecipeForm.reset();
      myRecipeSuccess.textContent = "Recipe added.";
      myRecipeSuccess.hidden = false;
      loadMyRecipes();
    });
  });

  document.addEventListener("spookybites:auth", function (e) {
    db = window.spookyBitesDb;
    session = e.detail.session;
    if (session) {
      prompt.hidden = true;
      content.hidden = false;
      fillForm(e.detail.profile);
      loadFavourites();
      loadRecipesForSelect().then(loadMyPhotos);
      loadMyRecipes();
    } else {
      prompt.hidden = false;
      content.hidden = true;
    }
  });
})();
