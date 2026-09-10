// "Favourite a recipe" — writes to the Spooky Bites database via SpookyBitesDB.
// Present on the recipe list and each full recipe page (any [data-fav-slug]).
(function () {
  "use strict";

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll("[data-fav-slug]")
  );
  if (!buttons.length) return;

  var db = window.SpookyBitesDB;

  /* ---- status announcements (screen-reader friendly) ---- */
  var status = document.createElement("p");
  status.className = "sr-only";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  document.body.appendChild(status);
  function announce(msg) {
    status.textContent = "";
    status.textContent = msg;
  }

  /* ---- "saving as ..." bar ---- */
  var bar = document.createElement("p");
  bar.className = "fav-bar";
  bar.hidden = true;
  var list = document.querySelector(".item-list");
  if (list) {
    list.parentNode.insertBefore(bar, list);
  } else {
    buttons[0].parentNode.insertBefore(bar, buttons[0]);
  }

  function renderBar() {
    var email = db ? db.identity.get().email : "";
    bar.innerHTML = "";
    if (!email) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    bar.appendChild(document.createTextNode("Saving favourites as " + email + " · "));
    var switchBtn = document.createElement("button");
    switchBtn.type = "button";
    switchBtn.className = "fav-switch";
    switchBtn.textContent = "Not you?";
    switchBtn.addEventListener("click", function () {
      db.identity.clear();
      setAll([]);
      renderBar();
      announce("Signed out. Saving a favourite will ask for your email again.");
    });
    bar.appendChild(switchBtn);
  }

  /* ---- button state ---- */
  function setPressed(btn, on) {
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    var heart = btn.querySelector(".fav-heart");
    if (heart) heart.textContent = on ? "♥" : "♡"; // filled / hollow
    var text = btn.querySelector(".fav-btn-text");
    if (text) text.textContent = on ? "Saved to favourites" : "Save to my favourites";
  }

  function setAll(slugs) {
    buttons.forEach(function (btn) {
      setPressed(btn, slugs.indexOf(btn.getAttribute("data-fav-slug")) !== -1);
    });
  }

  function refresh() {
    if (!db) return;
    var email = db.identity.get().email;
    if (!email) {
      setAll([]);
      return;
    }
    db.listFavourites(email).then(setAll).catch(function () {
      /* leave buttons as-is if the lookup fails */
    });
  }

  /* ---- first-time dialog: collect name + email ---- */
  var dialog, dialogForm, pendingBtn, lastFocused;

  function buildDialog() {
    dialog = document.createElement("div");
    dialog.className = "modal-overlay";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "fav-dialog-heading");
    dialog.hidden = true;
    dialog.innerHTML =
      '<div class="modal-box">' +
      '<button class="modal-close" type="button" aria-label="Close">✕</button>' +
      '<h2 id="fav-dialog-heading">Save your favourites</h2>' +
      "<p>Add your name and email so your favourite bakes stay together between visits. " +
      "This also adds you to the newsletter.</p>" +
      '<form novalidate>' +
      '<p class="form-error" role="alert" hidden></p>' +
      '<div class="form-field"><label for="fav-dialog-name">Name</label>' +
      '<input type="text" id="fav-dialog-name" autocomplete="name" required /></div>' +
      '<div class="form-field"><label for="fav-dialog-email">Email</label>' +
      '<input type="email" id="fav-dialog-email" autocomplete="email" required /></div>' +
      '<button class="btn" type="submit">Save favourite</button>' +
      "</form>" +
      "</div>";
    document.body.appendChild(dialog);
    dialogForm = dialog.querySelector("form");

    dialog.querySelector(".modal-close").addEventListener("click", closeDialog);
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) closeDialog();
    });
    dialog.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeDialog();
        return;
      }
      if (e.key !== "Tab") return;
      var f = Array.prototype.filter.call(
        dialog.querySelectorAll("button, input"),
        function (el) {
          return el.offsetParent !== null;
        }
      );
      if (!f.length) return;
      var first = f[0];
      var last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
    dialogForm.addEventListener("submit", onDialogSubmit);
  }

  function openDialog(btn) {
    if (!dialog) buildDialog();
    pendingBtn = btn;
    lastFocused = btn;
    var id = db.identity.get();
    dialog.querySelector("#fav-dialog-name").value = id.name || "";
    dialog.querySelector("#fav-dialog-email").value = id.email || "";
    dialog.querySelector(".form-error").hidden = true;
    dialog.hidden = false;
    dialog.querySelector("#fav-dialog-name").focus();
  }

  function closeDialog() {
    if (!dialog) return;
    dialog.hidden = true;
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onDialogSubmit(e) {
    e.preventDefault();
    var nameEl = dialog.querySelector("#fav-dialog-name");
    var emailEl = dialog.querySelector("#fav-dialog-email");
    var errEl = dialog.querySelector(".form-error");
    var submit = dialogForm.querySelector('button[type="submit"]');
    errEl.hidden = true;

    var name = nameEl.value.trim();
    var email = emailEl.value.trim();
    if (!name) {
      errEl.textContent = "Please enter your name.";
      errEl.hidden = false;
      nameEl.focus();
      return;
    }
    if (!email || !emailEl.checkValidity()) {
      errEl.textContent = "Please enter a valid email address.";
      errEl.hidden = false;
      emailEl.focus();
      return;
    }

    var slug = pendingBtn.getAttribute("data-fav-slug");
    submit.disabled = true;
    submit.textContent = "Saving…";
    db.subscribe(name, email)
      .then(function () {
        return db.addFavourite(email, slug);
      })
      .then(function () {
        db.identity.set(name, email);
        submit.disabled = false;
        submit.textContent = "Save favourite";
        closeDialog();
        renderBar();
        refresh();
        announce("Saved to your favourites.");
      })
      .catch(function (err) {
        submit.disabled = false;
        submit.textContent = "Save favourite";
        errEl.textContent = err.message || "Could not save. Please try again.";
        errEl.hidden = false;
      });
  }

  /* ---- clicks ---- */
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (!db) {
        announce("Favourites need an internet connection.");
        return;
      }
      var email = db.identity.get().email;
      var slug = btn.getAttribute("data-fav-slug");

      if (!email) {
        openDialog(btn);
        return;
      }

      var wasOn = btn.getAttribute("aria-pressed") === "true";
      setPressed(btn, !wasOn); // optimistic
      btn.disabled = true;
      var op = wasOn
        ? db.removeFavourite(email, slug)
        : db.addFavourite(email, slug);
      op.then(function () {
        btn.disabled = false;
        announce(wasOn ? "Removed from your favourites." : "Saved to your favourites.");
      }).catch(function (err) {
        setPressed(btn, wasOn); // revert
        btn.disabled = false;
        announce(err.message || "Could not update your favourites.");
      });
    });
  });

  renderBar();
  refresh();
})();
