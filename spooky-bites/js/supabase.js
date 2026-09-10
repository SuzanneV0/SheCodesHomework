// Minimal Supabase REST client for Spooky Bites — no SDK, no build step.
// The publishable key is safe to ship: every table has Row Level Security on,
// and the site only calls SECURITY DEFINER functions that validate their input.
window.SpookyBitesDB = (function () {
  "use strict";

  var BASE_URL = "https://itwsbzoampkxwdmtwvoo.supabase.co";
  var PUBLISHABLE_KEY = "sb_publishable_lCvhYp63BsUFFS4vrcwG-Q_0iJLFCDX";

  // Call a Postgres function exposed at /rest/v1/rpc/<name>.
  function rpc(fnName, args) {
    return fetch(BASE_URL + "/rest/v1/rpc/" + fnName, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: PUBLISHABLE_KEY,
        Authorization: "Bearer " + PUBLISHABLE_KEY
      },
      body: JSON.stringify(args || {})
    }).then(function (res) {
      return res.text().then(function (body) {
        if (res.ok) {
          if (!body) return null;
          try {
            return JSON.parse(body);
          } catch (e) {
            return body;
          }
        }
        var message = "Something went wrong (" + res.status + ").";
        try {
          var parsed = JSON.parse(body);
          message = parsed.message || parsed.hint || message;
        } catch (e) {
          /* keep default message */
        }
        var err = new Error(message);
        err.status = res.status;
        throw err;
      });
    });
  }

  // Remember who the visitor is (the email they subscribed / favourited with),
  // stored only in their own browser so favourites work between visits.
  var identity = {
    get: function () {
      try {
        return {
          email: localStorage.getItem("spooky-bites-email") || "",
          name: localStorage.getItem("spooky-bites-name") || ""
        };
      } catch (e) {
        return { email: "", name: "" };
      }
    },
    set: function (name, email) {
      try {
        localStorage.setItem(
          "spooky-bites-email",
          (email || "").trim().toLowerCase()
        );
        if (name) localStorage.setItem("spooky-bites-name", name.trim());
      } catch (e) {
        /* storage unavailable */
      }
    },
    clear: function () {
      try {
        localStorage.removeItem("spooky-bites-email");
        localStorage.removeItem("spooky-bites-name");
      } catch (e) {
        /* ignore */
      }
    }
  };

  return {
    identity: identity,
    subscribe: function (name, email) {
      return rpc("subscribe_to_newsletter", { p_name: name, p_email: email });
    },
    addFavourite: function (email, slug) {
      return rpc("add_favourite", { p_email: email, p_slug: slug });
    },
    removeFavourite: function (email, slug) {
      return rpc("remove_favourite", { p_email: email, p_slug: slug });
    },
    listFavourites: function (email) {
      return rpc("list_favourites", { p_email: email }).then(function (rows) {
        return (rows || []).map(function (r) {
          return r.recipe_slug;
        });
      });
    }
  };
})();
