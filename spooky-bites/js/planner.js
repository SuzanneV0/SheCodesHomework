// Party menu planner: persist the checklist in localStorage per checkbox id.
(function () {
  "use strict";

  var STORAGE_KEY = "spooky-bites-planner";
  var form = document.getElementById("planner");
  if (!form) return;

  var boxes = Array.prototype.slice.call(
    form.querySelectorAll("input[type='checkbox']")
  );
  var countEl = document.getElementById("planner-count");
  var resetBtn = document.getElementById("planner-reset");

  function load() {
    var saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      saved = {};
    }
    boxes.forEach(function (box) {
      if (saved[box.id]) box.checked = true;
    });
  }

  function save() {
    var state = {};
    boxes.forEach(function (box) {
      if (box.checked) state[box.id] = true;
    });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  function updateCount() {
    var done = boxes.filter(function (b) {
      return b.checked;
    }).length;
    if (countEl) {
      countEl.textContent = done + " of " + boxes.length + " picked";
    }
  }

  load();
  updateCount();

  form.addEventListener("change", function (e) {
    if (e.target && e.target.type === "checkbox") {
      save();
      updateCount();
    }
  });

  if (resetBtn) {
    resetBtn.addEventListener("click", function () {
      boxes.forEach(function (box) {
        box.checked = false;
      });
      save();
      updateCount();
    });
  }
})();
