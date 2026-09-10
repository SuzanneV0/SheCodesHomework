// Search + category + difficulty filtering for the recipe list.
// Pure client side; filter state is mirrored in the URL query string.
(function () {
  "use strict";

  var form = document.getElementById("recipe-filter");
  if (!form) return;

  var search = document.getElementById("rf-search");
  var category = document.getElementById("rf-category");
  var difficulty = document.getElementById("rf-difficulty");
  var clearBtn = document.getElementById("rf-clear");
  var count = document.getElementById("rf-count");
  var empty = document.getElementById("rf-empty");

  var cards = Array.prototype.slice.call(document.querySelectorAll(".item-list .item-card"));
  var total = cards.length;

  // Cache each card's searchable text once.
  cards.forEach(function (card) {
    card._text = (card.textContent || "").toLowerCase();
  });

  form.addEventListener("submit", function (e) { e.preventDefault(); });

  function readURL() {
    var p = new URLSearchParams(location.search);
    search.value = p.get("q") || "";
    category.value = p.get("category") || "";
    difficulty.value = p.get("difficulty") || "";
  }

  function writeURL() {
    var p = new URLSearchParams();
    if (search.value.trim()) p.set("q", search.value.trim());
    if (category.value) p.set("category", category.value);
    if (difficulty.value) p.set("difficulty", difficulty.value);
    var qs = p.toString();
    history.replaceState(null, "", qs ? "?" + qs : location.pathname);
  }

  function apply() {
    var q = search.value.trim().toLowerCase();
    var cat = category.value;
    var diff = difficulty.value;
    var shown = 0;

    cards.forEach(function (card) {
      var ok =
        (!q || card._text.indexOf(q) !== -1) &&
        (!cat || card.getAttribute("data-category") === cat) &&
        (!diff || card.getAttribute("data-difficulty") === diff);
      card.hidden = !ok;
      if (ok) shown += 1;
    });

    var filtered = q || cat || diff;
    count.textContent = filtered
      ? "Showing " + shown + " of " + total + " bakes"
      : total + " bakes";
    if (empty) empty.hidden = shown !== 0;
    clearBtn.hidden = !filtered;

    writeURL();
  }

  ["input", "change"].forEach(function (evt) {
    search.addEventListener(evt, apply);
    category.addEventListener(evt, apply);
    difficulty.addEventListener(evt, apply);
  });

  clearBtn.addEventListener("click", function () {
    search.value = "";
    category.value = "";
    difficulty.value = "";
    apply();
    search.focus();
  });

  readURL();
  apply();
})();
