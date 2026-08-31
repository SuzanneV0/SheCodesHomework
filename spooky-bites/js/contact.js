// Contact form handling (no backend wired up yet -- confirms locally).
(function () {
  "use strict";

  var form = document.getElementById("contact-form");
  var successMsg = document.getElementById("contact-success");
  var errorMsg = document.getElementById("contact-error");

  if (!form) return;

  function showError(text, field) {
    if (errorMsg) {
      errorMsg.textContent = text;
      errorMsg.hidden = false;
    }
    if (field) field.focus();
  }

  function clearError() {
    if (errorMsg) errorMsg.hidden = true;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    clearError();

    var name = document.getElementById("contact-name");
    var email = document.getElementById("contact-email");
    var robotCheck = document.getElementById("contact-not-robot");

    if (name && !name.value.trim()) {
      return showError("Please enter your name.", name);
    }
    if (email && !email.value.trim()) {
      return showError("Please enter your email address.", email);
    }
    if (email && !email.checkValidity()) {
      return showError("Please enter a valid email address.", email);
    }
    if (robotCheck && !robotCheck.checked) {
      return showError("Please confirm you are not a robot.", robotCheck);
    }

    form.hidden = true;
    if (successMsg) {
      successMsg.hidden = false;
      successMsg.focus();
    }
  });
})();
