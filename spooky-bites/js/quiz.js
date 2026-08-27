// "What is your Halloween baking style?" quiz logic.
(function () {
  "use strict";

  var results = {
    decorator: {
      title: "The Perfectionist Decorator 🎨",
      text: "Piping bags, royal icing, and a steady hand. Your cookies could go in a gallery, and you have the tweezers to prove it.",
    },
    scientist: {
      title: "The Mad Scientist 🧪",
      text: "Color-changing batter, dry-ice fog, gummy-worm surprises inside. If it bubbles or glows, you're already preheating the oven.",
    },
    classicist: {
      title: "The Cozy Classicist 🧡",
      text: "Pumpkin bread, spiced everything, a house that smells like October. You bake the recipes your family actually asks for.",
    },
    showstopper: {
      title: "The Showstopper 🎂",
      text: "Three tiers, a hidden filling, and a dramatic slice reveal. Go big or stay home — and you are never staying home.",
    },
    chaos: {
      title: "The Chaos Baker 🦇",
      text: "No recipe, one bowl, whatever's in the pantry. Somehow it works, and somehow you can never make it exactly the same again.",
    },
    minimalist: {
      title: "The No-Bake Minimalist 🕸️",
      text: "Fridge, microwave, a box of cookies and some melted chocolate. Maximum spooky, minimum dishes. Genius, honestly.",
    },
  };

  var priority = [
    "decorator",
    "scientist",
    "classicist",
    "showstopper",
    "chaos",
    "minimalist",
  ];

  var form = document.getElementById("quiz-form");
  var resultBox = document.getElementById("quiz-result");
  var resultTitle = document.getElementById("quiz-result-title");
  var resultText = document.getElementById("quiz-result-text");
  var retakeBtn = document.getElementById("quiz-retake");

  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var tallies = {};
    priority.forEach(function (key) {
      tallies[key] = 0;
    });

    var checked = form.querySelectorAll("input[type='radio']:checked");
    if (checked.length < form.querySelectorAll("fieldset").length) {
      var firstUnanswered = form.querySelector(
        "fieldset:not(:has(input:checked))"
      );
      if (firstUnanswered && firstUnanswered.scrollIntoView) {
        firstUnanswered.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    checked.forEach(function (input) {
      var style = input.getAttribute("data-style");
      if (style && tallies.hasOwnProperty(style)) {
        tallies[style] += 1;
      }
    });

    var winner = priority[0];
    var best = -1;
    priority.forEach(function (key) {
      if (tallies[key] > best) {
        best = tallies[key];
        winner = key;
      }
    });

    var result = results[winner];
    if (resultTitle) resultTitle.textContent = "You're " + result.title;
    if (resultText) resultText.textContent = result.text;

    form.hidden = true;
    if (resultBox) {
      resultBox.hidden = false;
      resultBox.setAttribute("tabindex", "-1");
      resultBox.focus();
    }
  });

  if (retakeBtn) {
    retakeBtn.addEventListener("click", function () {
      form.reset();
      form.hidden = false;
      if (resultBox) resultBox.hidden = true;
      form.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
})();
