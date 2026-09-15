// Ratings & reviews on recipe pages. The average + review list are public
// and visible to everyone; leaving a rating is behind sign-in, same as
// favouriting. Also keeps the page's Recipe structured data's
// aggregateRating/review fields in sync with the live data.
(function () {
  "use strict";

  var container = document.getElementById("reviews-section");
  if (!container || typeof window.supabase === "undefined") return;

  var SUPABASE_URL = "https://itwsbzoampkxwdmtwvoo.supabase.co";
  var SUPABASE_KEY = "sb_publishable_lCvhYp63BsUFFS4vrcwG-Q_0iJLFCDX";
  var db = window.spookyBitesDb || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  var slug = container.getAttribute("data-recipe-slug");
  var summaryEl = document.getElementById("reviews-summary");
  var listEl = document.getElementById("reviews-list");
  var signedOutEl = document.getElementById("review-signed-out");
  var signinBtn = document.getElementById("review-signin-btn");
  var form = document.getElementById("review-form");
  var starButtons = document.getElementById("star-buttons");
  var ratingInput = document.getElementById("review-rating");
  var bodyInput = document.getElementById("review-body");
  var errorEl = document.getElementById("review-error");
  var successEl = document.getElementById("review-success");
  var submitBtn = document.getElementById("review-submit");
  if (!slug || !summaryEl || !form) return;

  var recipeId = null;
  var session = null;

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function stars(n) {
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }

  function setStars(n) {
    ratingInput.value = n;
    Array.prototype.forEach.call(starButtons.children, function (btn) {
      var v = Number(btn.getAttribute("data-star"));
      btn.classList.toggle("on", v <= n);
      btn.setAttribute("aria-pressed", v <= n ? "true" : "false");
    });
  }

  starButtons.addEventListener("click", function (e) {
    var btn = e.target.closest(".star-btn");
    if (!btn) return;
    setStars(Number(btn.getAttribute("data-star")));
  });

  function updateSchema(avg, count, reviews) {
    var script = document.getElementById("recipe-schema");
    if (!script) return;
    try {
      var data = JSON.parse(script.textContent);
      if (count > 0) {
        data.aggregateRating = {
          "@type": "AggregateRating",
          "ratingValue": Number(avg.toFixed(1)),
          "reviewCount": count
        };
        data.review = reviews.filter(function (r) { return r.body; }).slice(0, 10).map(function (r) {
          return {
            "@type": "Review",
            "reviewRating": { "@type": "Rating", "ratingValue": r.rating, "bestRating": 5 },
            "author": { "@type": "Person", "name": "Spooky Bites reader" },
            "reviewBody": r.body
          };
        });
      } else {
        delete data.aggregateRating;
        delete data.review;
      }
      script.textContent = JSON.stringify(data, null, 2);
    } catch (e) { /* leave schema as-is if anything's malformed */ }
  }

  function renderReviews(reviews) {
    if (!reviews.length) {
      summaryEl.textContent = "No ratings yet — be the first.";
      listEl.innerHTML = "";
      updateSchema(0, 0, []);
      return;
    }
    var avg = reviews.reduce(function (t, r) { return t + r.rating; }, 0) / reviews.length;
    summaryEl.innerHTML = '<span class="stars-static">' + stars(Math.round(avg)) + "</span> " +
      avg.toFixed(1) + " out of 5 (" + reviews.length + (reviews.length === 1 ? " rating" : " ratings") + ")";
    var withBody = reviews.filter(function (r) { return r.body; });
    listEl.innerHTML = withBody.map(function (r) {
      return '<li><span class="stars-static">' + stars(r.rating) + "</span>" +
        '<div class="item-body">' + esc(r.body) + "</div></li>";
    }).join("");
    updateSchema(avg, reviews.length, reviews);
  }

  function loadReviews() {
    summaryEl.innerHTML = '<span class="loading-note"><span class="spinner" aria-hidden="true"></span> Loading ratings…</span>';
    return db.from("recipe_reviews").select("rating, body").eq("recipe_id", recipeId).then(function (res) {
      renderReviews(res.data || []);
    });
  }

  function loadMyReview() {
    if (!session || !recipeId) { setStars(0); bodyInput.value = ""; return; }
    db.from("recipe_reviews").select("rating, body").eq("recipe_id", recipeId).eq("user_id", session.user.id)
      .maybeSingle().then(function (res) {
        if (res.data) { setStars(res.data.rating); bodyInput.value = res.data.body || ""; }
        else { setStars(0); bodyInput.value = ""; }
      });
  }

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

  signinBtn.addEventListener("click", function () {
    var toggle = document.getElementById("account-toggle");
    if (toggle) toggle.click();
  });

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var currentSession = window.spookyBitesSession || session;
    if (!currentSession || !recipeId) return;
    var rating = Number(ratingInput.value);
    if (!rating) { showError("Pick a star rating first."); return; }
    showError("");
    showSuccess("");
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting…";
    db.from("recipe_reviews").upsert({
      user_id: currentSession.user.id,
      recipe_id: recipeId,
      rating: rating,
      body: bodyInput.value.trim() || null
    }, { onConflict: "user_id,recipe_id" }).then(function (res) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit rating";
      if (res.error) { showError(res.error.message); return; }
      showSuccess("Thanks for rating this recipe!");
      if (window.spookyToast) window.spookyToast("Rating submitted — thanks!");
      loadReviews();
    });
  });

  db.from("recipes").select("id").eq("slug", slug).single().then(function (res) {
    if (!res.data) return;
    recipeId = res.data.id;
    loadReviews();
    loadMyReview();
  });

  document.addEventListener("spookybites:auth", function (e) {
    session = e.detail.session;
    signedOutEl.hidden = !!session;
    form.hidden = !session;
    loadMyReview();
  });
})();
