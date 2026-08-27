// Contact form handling (no backend wired up yet -- confirms locally).
(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  var successMsg = document.getElementById("contact-success");

  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var robotCheck = document.getElementById("contact-not-robot");
    if (robotCheck && !robotCheck.checked) {
      robotCheck.focus();
      return;
    }

    form.hidden = true;
    if (successMsg) successMsg.hidden = false;
  });
})();
