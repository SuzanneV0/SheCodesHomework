// Public, read-only gallery of visitor-submitted photos tagged to this
// recipe (uploaded from account.html). No sign-in needed to view.
(function () {
  "use strict";

  var container = document.getElementById("reader-gallery");
  if (!container || typeof window.supabase === "undefined") return;

  var SUPABASE_URL = "https://itwsbzoampkxwdmtwvoo.supabase.co";
  var SUPABASE_KEY = "sb_publishable_lCvhYp63BsUFFS4vrcwG-Q_0iJLFCDX";
  var db = window.spookyBitesDb || window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  var slug = container.getAttribute("data-recipe-slug");
  var list = container.querySelector(".reader-gallery");
  var empty = container.querySelector(".reader-gallery-empty");
  if (!slug || !list) return;

  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  db.from("recipes").select("id").eq("slug", slug).single().then(function (res) {
    if (!res.data) return;
    return db.from("user_recipe_photos")
      .select("image_url")
      .eq("recipe_id", res.data.id)
      .order("created_at", { ascending: false })
      .then(function (photoRes) {
        var rows = photoRes.data || [];
        if (empty) empty.hidden = rows.length > 0;
        list.innerHTML = rows.map(function (p) {
          return '<li><img src="' + esc(p.image_url) + '" alt="A reader’s photo of this bake" loading="lazy" /></li>';
        }).join("");
      });
  });
})();
