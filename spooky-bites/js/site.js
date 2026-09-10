// Shared site behavior: theme toggle + hamburger nav + newsletter modal.
(function () {
  "use strict";

  /* ---- Theme toggle ---- */
  var root = document.documentElement;
  var toggleBtn = document.getElementById("theme-toggle");
  var STORAGE_KEY = "spooky-bites-theme";

  function applyTheme(theme) {
    if (theme === "dark" || theme === "light") {
      root.setAttribute("data-theme", theme);
    } else {
      root.removeAttribute("data-theme");
    }
    if (toggleBtn) {
      var isDark =
        theme === "dark" ||
        (!theme &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      toggleBtn.textContent = isDark ? "☀️" : "🌙";
      toggleBtn.setAttribute(
        "aria-label",
        isDark ? "Switch to light mode" : "Switch to dark mode"
      );
    }
  }

  var saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    /* storage unavailable, fall back to system preference */
  }
  applyTheme(saved);

  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var current = root.getAttribute("data-theme");
      var systemDark =
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      var currentlyDark = current === "dark" || (!current && systemDark);
      var next = currentlyDark ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch (e) {
        /* ignore */
      }
    });
  }

  /* ---- Mark the current page in the nav (aria-current) ---- */
  var here = location.pathname.replace(/\/$/, "/index.html").split("/").pop();
  document.querySelectorAll(".nav-links a, .footer-nav a").forEach(function (a) {
    var target = a.getAttribute("href").split("/").pop();
    if (target === here) a.setAttribute("aria-current", "page");
  });

  /* ---- Mobile hamburger nav ---- */
  var navToggle = document.getElementById("nav-toggle");
  var navLinks = document.getElementById("nav-links");
  var MOBILE_BREAKPOINT = 860;

  function closeNavMenu() {
    if (!navLinks || !navToggle) return;
    navLinks.classList.remove("open");
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.textContent = "☰";
  }

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var isOpen = navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      navToggle.textContent = isOpen ? "✕" : "☰";
    });

    navLinks.addEventListener("click", function (e) {
      if (e.target.tagName === "A") closeNavMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > MOBILE_BREAKPOINT) closeNavMenu();
    });
  }

  /* ---- Newsletter modal ---- */
  var modal = document.getElementById("newsletter-modal");
  var openBtns = document.querySelectorAll("[data-open-newsletter]");
  var closeBtn = document.getElementById("newsletter-close");
  var form = document.getElementById("newsletter-form");
  var successMsg = document.getElementById("newsletter-success");
  var lastFocused = null;

  function openModal() {
    if (!modal) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    var firstInput = modal.querySelector("input");
    if (firstInput) firstInput.focus();
    document.addEventListener("keydown", onKeydown);
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.removeEventListener("keydown", onKeydown);
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  }

  function getFocusable() {
    if (!modal) return [];
    return Array.prototype.filter.call(
      modal.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ),
      function (el) {
        return el.offsetParent !== null;
      }
    );
  }

  function onKeydown(e) {
    if (e.key === "Escape") {
      closeModal();
      return;
    }
    if (e.key !== "Tab") return;
    // Keep Tab focus inside the dialog (WCAG 2.4.3 / 2.1.2)
    var items = getFocusable();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  openBtns.forEach(function (btn) {
    btn.addEventListener("click", openModal);
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);

  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) closeModal();
    });
  }

  if (form) {
    var nameInput = document.getElementById("newsletter-name");
    var emailInput = document.getElementById("newsletter-email");
    var errorMsg = document.getElementById("newsletter-error");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (errorMsg) errorMsg.hidden = true;

      var name = nameInput ? nameInput.value.trim() : "";
      var email = emailInput ? emailInput.value.trim() : "";

      function fail(text, field) {
        if (errorMsg) {
          errorMsg.textContent = text;
          errorMsg.hidden = false;
        }
        if (field) field.focus();
      }

      if (!name) return fail("Please enter your name.", nameInput);
      if (!email || (emailInput && !emailInput.checkValidity())) {
        return fail("Please enter a valid email address.", emailInput);
      }

      // Front-end demo only: nothing is sent to a server or stored anywhere.
      form.hidden = true;
      if (successMsg) {
        successMsg.hidden = false;
        successMsg.focus();
      } else if (closeBtn) {
        closeBtn.focus();
      }
    });
  }
})();
