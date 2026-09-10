// "Save to favourites" — stored only in this browser's localStorage.
// Nothing is ever sent to a server. Present wherever a [data-fav-slug] button is.
(function () {
  "use strict";

  var buttons = Array.prototype.slice.call(
    document.querySelectorAll("[data-fav-slug]")
  );
  if (!buttons.length) return;

  var STORAGE_KEY = "spooky-bites-favourites";

  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function save(list) {
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

  function render() {
    var list = load();
    buttons.forEach(function (btn) {
      setPressed(btn, list.indexOf(btn.getAttribute("data-fav-slug")) !== -1);
    });
  }

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var slug = btn.getAttribute("data-fav-slug");
      var list = load();
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
      save(list);
    });
  });

  render();
})();
