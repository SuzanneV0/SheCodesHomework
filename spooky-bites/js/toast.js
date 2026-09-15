// Lightweight toast notifications, shared site-wide. Usage:
//   window.spookyToast("Saved to your favourites.");
//   window.spookyToast("Something went wrong.", "error");
(function () {
  "use strict";

  var container = document.createElement("div");
  container.className = "toast-stack";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  container.setAttribute("aria-atomic", "false");

  function mount() {
    document.body.appendChild(container);
  }
  if (document.body) mount();
  else document.addEventListener("DOMContentLoaded", mount);

  window.spookyToast = function (message, kind) {
    if (!message) return;
    var toast = document.createElement("div");
    toast.className = "toast" + (kind === "error" ? " toast-error" : "");
    toast.textContent = message;
    container.appendChild(toast);

    // Force layout before adding the "in" class so the transition runs.
    void toast.offsetWidth;
    toast.classList.add("toast-in");

    window.setTimeout(function () {
      toast.classList.remove("toast-in");
      toast.classList.add("toast-out");
      toast.addEventListener("transitionend", function () {
        toast.remove();
      });
      window.setTimeout(function () { toast.remove(); }, 600);
    }, 3200);
  };
})();
