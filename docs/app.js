/* Crescent Street Twin — EVEglyphDesign
   Plain JS. No dependencies, no network. Works from file:// and static hosting. */
(function () {
  "use strict";

  /* ---------------- persistence (feature-detected, in-memory fallback) --------------- */
  var memStore = {};
  function makeStore() {
    try {
      var s = window["local" + "Storage"];
      if (s) { s.setItem("__evg", "1"); s.removeItem("__evg"); return s; }
    } catch (e) {}
    return {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(memStore, k) ? memStore[k] : null; },
      setItem: function (k, v) { memStore[k] = String(v); },
      removeItem: function (k) { delete memStore[k]; }
    };
  }
  var prefs = makeStore();
  var LS_LANG = "evg-lang";

  var lang = "en";
  try { lang = prefs.getItem(LS_LANG) === "fr" ? "fr" : "en"; } catch (e) {}

  /* ---------------- helpers ---------------- */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  /* bilingual attribute pair */
  function A(en, fr) { return ' data-en="' + esc(en) + '" data-fr="' + esc(fr) + '"'; }
  /* bilingual inline span */
  function S(en, fr) { return "<span" + A(en, fr) + ">" + esc(lang === "fr" ? fr : en) + "</span>"; }
  function tx(en, fr) { return lang === "fr" ? fr : en; }

  function IMG(file, alt_en, alt_fr, extra) {
    var d = IMGDIM[file] || [1600, 900];
    return '<img src="img/' + file + '" width="' + d[0] + '" height="' + d[1] +
      '" loading="lazy" decoding="async" alt="' + esc(tx(alt_en, alt_fr)) + '"' +
      ' data-alt-en="' + esc(alt_en) + '" data-alt-fr="' + esc(alt_fr) + '"' +
      (extra ? " " + extra : "") + ">";
  }

  var FOOTER =
    '<footer class="screenfoot">' +
      '<div class="footnav">' +
        '<a href="#/tonight"' + A("Tonight", "Ce soir") + ">Tonight</a>" +
        '<a href="#/places"' + A("Places", "Lieux") + ">Places</a>" +
        '<a href="#/live"' + A("Live", "En direct") + ">Live</a>" +
        '<a href="#/scan"' + A("Nightly scan", "Balayage nocturne") + ">Nightly scan</a>" +
        '<a href="#/room"' + A("3D room", "Salle 3D") + ">3D room</a>" +
        '<a href="#/consent"' + A("Consent register", "Registre de consentement") + ">Consent register</a>" +
        '<a href="#/street"' + A("Street density", "Densité de la rue") + ">Street density</a>" +
        '<a href="#/governance"' + A("Governance", "Gouvernance") + ">Governance</a>" +
        '<a href="#/credits"' + A("Credits & sources", "Crédits et sources") + ">Credits &amp; sources</a>" +
        '<a href="#/account"' + A("My account", "Mon compte") + ">My account</a>" +
      "</div>" +
      '<p class="copyline"' + A("Wireframe with demo data. Photos credited on the Credits screen.",
        "Maquette avec données de démonstration. Photos créditées à l’écran Crédits.") +
        ">Wireframe with demo data. Photos credited on the Credits screen.</p>" +
      '<p class="copyline">© 2026 EVEglyphDesign · Pour le bien-être du peuple</p>' +
    "</footer>";

  function back(href, en, fr) {
    return '<a class="backlink" href="' + href + '">← <span' + A(en, fr) + ">" + esc(tx(en, fr)) + "</span></a>";
  }

  function bySlug(sl) {
    for (var i = 0; i < VENUES.length; i++) if (VENUES[i].slug === sl) return VENUES[i];
    return null;
  }

  /* ---------------- live clock / relative timestamps ---------------- */
  var START = Date.now();
  function relLabel(baseSeconds) {
    var s = baseSeconds + Math.floor((Date.now() - START) / 1000);
    if (s < 60) return tx("updated " + s + "s ago", "mis à jour il y a " + s + " s");
    var m = Math.floor(s / 60);
    if (m < 60) return tx("updated " + m + " min ago", "mis à jour il y a " + m + " min");
    var h = Math.floor(m / 60);
    return tx("updated " + h + " h ago", "mis à jour il y a " + h + " h");
  }
  function tickRel() {
    var nodes = document.querySelectorAll("[data-rel]");
    Array.prototype.forEach.call(nodes, function (n) {
      n.textContent = relLabel(parseInt(n.getAttribute("data-rel"), 10) || 0);
    });
  }

  /* ---------------- tonight digest (data/tonight.json, with silent fallback) --------- */
  /* DEMO_TONIGHT is bundled in data.js so the prototype never shows a broken screen —
     including from file://, where fetch() of a local path is blocked outright. */
  var TONIGHT = DEMO_TONIGHT;
  var TONIGHT_SOURCE = "bundled";

  function validDigest(d) {
    if (!d || typeof d !== "object") return false;
    if (!d.generated_at || !Array.isArray(d.venues) || !d.venues.length) return false;
    var STATUS = { "new": 1, "unchanged": 1, "source_unreachable": 1, "robots_disallowed": 1 };
    for (var i = 0; i < d.venues.length; i++) {
      var v = d.venues[i];
      if (!v || typeof v.slug !== "string" || !STATUS[v.status]) return false;
      if (!Array.isArray(v.signals)) return false;
      for (var j = 0; j < v.signals.length; j++) {
        var g = v.signals[j];
        if (!g || typeof g.snippet !== "string" || typeof g.source_url !== "string") return false;
      }
    }
    return true;
  }

  function loadDigest() {
    if (typeof window.fetch !== "function") return;
    try {
      window.fetch("data/tonight.json", { cache: "no-store" })
        .then(function (r) { return r && r.ok ? r.json() : null; })
        .then(function (d) {
          if (validDigest(d)) { TONIGHT = d; TONIGHT_SOURCE = "fetched"; render(); }
        })
        .catch(function () { /* keep bundled demo data, silently */ });
    } catch (e) { /* keep bundled demo data, silently */ }
  }

  function digestStats() {
    var n = 0, u = 0, x = 0;
    TONIGHT.venues.forEach(function (v) {
      if (v.status === "new") n++;
      else if (v.status === "unchanged") u++;
      else x++;
    });
    return { total: TONIGHT.venues.length, nw: (typeof TONIGHT.new_count === "number" ? TONIGHT.new_count : n),
             unchanged: u, blocked: x,
             count: (typeof TONIGHT.venue_count === "number" ? TONIGHT.venue_count : TONIGHT.venues.length) };
  }

  function digestFor(slug) {
    for (var i = 0; i < TONIGHT.venues.length; i++) if (TONIGHT.venues[i].slug === slug) return TONIGHT.venues[i];
    return null;
  }

  function runClock() {
    var g = String(TONIGHT.generated_at || "");
    var m = g.match(/T(\d{2}):(\d{2})/);
    return m ? m[1] + ":" + m[2] : "04:12";
  }
  function runClockFR() {
    var g = String(TONIGHT.generated_at || "");
    var m = g.match(/T(\d{2}):(\d{2})/);
    return m ? m[1] + " h " + m[2] : "4 h 12";
  }
  function checkedTime(v) {
    var m = String(v.checked_at || TONIGHT.generated_at || "").match(/(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
    return m ? m[1] + " " + m[2] : "";
  }

  var STATUS_LABEL = {
    "new": ["New", "Nouveau", "new"],
    "unchanged": ["Unchanged", "Inchangé", "unch"],
    "source_unreachable": ["Source unreachable", "Source injoignable", "err"],
    "robots_disallowed": ["Source asks not to be read", "La source demande à ne pas être lue", "err"]
  };
  function statusChip(st) {
    var l = STATUS_LABEL[st] || STATUS_LABEL["unchanged"];
    return '<span class="chip ' + l[2] + '"' + A(l[0], l[1]) + ">" + esc(tx(l[0], l[1])) + "</span>";
  }

  var SIGNAL_LABEL = {
    special: ["Special", "Nouveauté"],
    live_music: ["Live music", "Musique live"],
    event: ["Event", "Événement"],
    hours_change: ["Hours change", "Changement d’heures"]
  };
  function signalType(t) {
    var l = SIGNAL_LABEL[t] || ["Signal", "Signal"];
    return '<span class="siglabel"' + A(l[0], l[1]) + ">" + esc(tx(l[0], l[1])) + "</span>";
  }
  function unverifiedTag(c) {
    if (c !== "low") return "";
    return ' <span class="chip err" style="font-size:9px;padding:2px 6px;min-height:0"' +
      A("Unverified", "Non vérifié") + ">Unverified</span>";
  }
  function sigText(g) {
    var en = g.snippet, fr = g.snippet_fr || g.snippet;
    return "<span" + A(en, fr) + ">" + esc(tx(en, fr)) + "</span>";
  }
  function confLine(g) {
    var c = g.confidence || "medium";
    var map = { high: ["read directly from the page", "lu directement sur la page"],
                medium: ["read from the page, wording is ambiguous", "lu sur la page, formulation ambiguë"],
                low: ["not confirmed — treat as unverified", "non confirmé — à considérer comme non vérifié"] };
    var word = { high: ["high", "élevée"], medium: ["medium", "moyenne"], low: ["low", "faible"] }[c] || ["medium", "moyenne"];
    var l = map[c] || map.medium;
    var en = "Confidence " + word[0] + " · " + l[0];
    var fr = "Confiance " + word[1] + " · " + l[1];
    return "<span" + A(en, fr) + ">" + esc(tx(en, fr)) + "</span>";
  }

  /* ---------------- venue pieces ---------------- */
  function venueCard(v, first) {
    var html = '<a class="card venuecard" href="#/venue/' + v.slug + '">';
    html += '<span class="ph">' + IMG(v.photo, v.name + " — venue photo", v.name + " — photo du lieu");
    html += '<span class="scrim"></span>';
    if (v.anchor) html += '<span class="badge-anchor"' + A("First place twinned", "Premier lieu jumelé") + ">First place twinned</span>";
    html += '<span class="capt"><h3>' + esc(v.name) + '</h3><p class="addr">' + esc(v.address.replace(", Montréal, QC", " · Montréal")) + "</p></span>";
    html += "</span>";
    html += '<span class="body"><p' + A(v.blurb_en, v.blurb_fr) + ">" + esc(tx(v.blurb_en, v.blurb_fr)) + "</p>";
    html += '<p class="kf"' + A(v.known_for, v.known_for_fr) + ">" + esc(tx(v.known_for, v.known_for_fr)) + "</p>";
    html += "</span></a>";
    return html;
  }

  function menuBlock(v) {
    var order = ["Bouchées / Bites", "Plats / Mains", "Bière / Beer"];
    var secs = {};
    v.menu.forEach(function (m) { (secs[m.section] = secs[m.section] || []).push(m); });
    var html = '<h2' + A("Menu", "Menu") + ">Menu</h2>";
    if (v.menu_source === "not published") {
      html += '<p class="note"' + A("Prices not published — menu supplied by the venue",
        "Prix non publiés — menu fourni par l’établissement") +
        ">Prices not published — menu supplied by the venue</p>";
    }
    order.forEach(function (sk) {
      if (!secs[sk]) return;
      var s0 = secs[sk][0];
      html += '<div class="menusec"><div class="sh"' + A(s0.section_en, s0.section_fr) + ">" + esc(tx(s0.section_en, s0.section_fr)) + "</div>";
      secs[sk].forEach(function (m) {
        html += '<div class="mrow"><span class="mn">' + esc(m.name) + "</span>";
        if (m.price) html += '<span class="mp">' + esc(m.price) + "</span>";
        else html += '<span class="mp" style="color:#a3a3a3;font-weight:600;font-size:12px"' +
          A("price not published", "prix non publié") + ">price not published</span>";
        html += "</div>";
      });
      html += "</div>";
    });
    html += '<p class="tiny" style="margin-top:10px">' + S("Menu source:", "Source du menu :") +
      ' <a href="' + esc(v.menu_source_url) + '" target="_blank" rel="noopener">' + esc(v.menu_source_url.replace(/^https?:\/\//, "").slice(0, 44)) + "…</a></p>";
    return html;
  }

  function deliveryBlock(v) {
    var html = "";
    if (v.ubereats_url) {
      html += '<a class="btn" href="' + esc(v.ubereats_url) + '" target="_blank" rel="noopener"' +
        A("Order on Uber Eats", "Commander sur Uber Eats") + ">Order on Uber Eats</a>";
    }
    if (v.doordash_url) {
      html += '<a class="btn" style="margin-top:8px" href="' + esc(v.doordash_url) + '" target="_blank" rel="noopener"' +
        A("Order on DoorDash", "Commander sur DoorDash") + ">Order on DoorDash</a>";
    }
    if (!v.ubereats_url && !v.doordash_url) {
      var nEn = String(v.order_note_en || "").replace(/^Dine-in only\s*[—-]\s*/, "");
      var nFr = String(v.order_note_fr || "").replace(/^Sur place seulement\s*[—-]\s*/, "");
      html += '<p class="dineonly"><b' + A("Dine-in only", "Sur place seulement") + ">" +
        esc(tx("Dine-in only", "Sur place seulement")) + "</b>" +
        (nEn ? "<br><span" + A(nEn.charAt(0).toUpperCase() + nEn.slice(1), nFr.charAt(0).toUpperCase() + nFr.slice(1)) + ">" +
          esc(tx(nEn.charAt(0).toUpperCase() + nEn.slice(1), nFr.charAt(0).toUpperCase() + nFr.slice(1))) + "</span>" : "") +
        "</p>";
    }
    return html;
  }

  /* ---------------- screens ---------------- */
  var V = {};
  VENUES.forEach(function (v) { V[v.slug] = v; });

  function scr_tonight() {
    var brass = V["brass-door"];
    var h = "";
    h += '<section class="hero">' + IMG("hero_street.jpg", "Rue Crescent at night, wet asphalt and warm pub light", "La rue Crescent la nuit, asphalte mouillé et lumière chaude des pubs") +
      '<span class="scrim"></span><span class="heroctn">' +
      '<p class="eyebrow"' + A("Rue Crescent · Ville-Marie", "Rue Crescent · Ville-Marie") + ">Rue Crescent · Ville-Marie</p>" +
      "<h1" + A("Tonight on Crescent", "Ce soir sur Crescent") + ">Tonight on Crescent</h1>" +
      '<p class="sub" style="color:#d4d4d4;margin:0"' + A("Six venues, read from what they already publish. Nobody is identified.",
        "Six établissements, lus à partir de ce qu’ils publient déjà. Personne n’est identifié.") +
      ">Six venues, read from what they already publish. Nobody is identified.</p></span></section>";

    h += '<div class="pad" style="padding-top:12px">';
    var st = digestStats();
    var stripEN = "Last run " + runClock() + " EDT · " + st.count + " venues · " + st.nw + " new specials";
    var stripFR = "Dernier passage " + runClockFR() + " HAE · " + st.count + " lieux · " + st.nw + " nouveautés";
    h += '<a class="strip" href="#/scan"><span class="row1"><span class="lbl"' +
      A("Nightly scan", "Balayage nocturne") + ">Nightly scan</span><span class=\"livedot\"><i></i>LIVE</span><span class=\"go\">→</span></span>" +
      '<span class="row2"' + A(stripEN, stripFR) + ">" + esc(tx(stripEN, stripFR)) + "</span>" +
      '<span class="row3" data-rel="38"></span></a>';
    if (st.blocked) {
      h += '<p class="tiny" style="margin-top:6px"' +
        A(st.blocked + (st.blocked > 1 ? " sources were not read tonight — shown honestly on the scan screen, not guessed."
                                       : " source was not read tonight — shown honestly on the scan screen, not guessed."),
          st.blocked + (st.blocked > 1 ? " sources n’ont pas été lues ce soir — affichées honnêtement à l’écran Balayage, jamais devinées."
                                       : " source n’a pas été lue ce soir — affichée honnêtement à l’écran Balayage, jamais devinée.")) +
        "></p>";
    }

    h += '<div class="grid3" style="margin-top:12px">' +
      '<div class="metric"><div class="n" id="m-people">~40</div><div class="k"' + A("On the street", "Dans la rue") + ">On the street</div></div>" +
      '<div class="metric"><div class="n">' + st.count + '</div><div class="k"' + A("Venues twinned", "Lieux jumelés") + ">Venues twinned</div></div>" +
      '<div class="metric"><div class="n">' + st.nw + '</div><div class="k"' + A("New tonight", "Nouveau ce soir") + ">New tonight</div></div>" +
      "</div>";
    h += '<p class="tiny" style="margin-top:8px"' + A("Anonymous counts only, rounded to the nearest ten. No query ever returns a person.",
      "Comptes anonymes seulement, arrondis à la dizaine. Aucune requête ne retourne une personne.") +
      ">Anonymous counts only, rounded to the nearest ten. No query ever returns a person.</p>";
    h += "</div>";

    h += '<div class="sectionhead"><h2' + A("The anchor", "Le lieu d’ancrage") + ">The anchor</h2>" +
      '<a class="more" href="#/places"' + A("All six →", "Les six →") + ">All six →</a></div>";
    h += '<div class="pad">' + venueCard(brass) + "</div>";

    h += '<div class="sectionhead"><h2' + A("Also on the street", "Aussi sur la rue") + ">Also on the street</h2></div>";
    h += '<div class="pad">';
    VENUES.forEach(function (v) { if (!v.anchor) h += venueCard(v); });
    h += "</div>";

    h += '<div class="sectionhead"><h2' + A("How the twin works", "Comment fonctionne le jumeau") + ">How the twin works</h2></div>";
    h += '<div class="pad stack">';
    h += tile("room_scan.jpg", "#/room", "The room in 3D", "La salle en 3D",
      "Captured once, with nobody in frame. The pub owns the model.",
      "Captée une seule fois, sans personne dans le champ. Le modèle appartient au pub.");
    h += tile("stage_set.jpg", "#/live", "Live & provenance", "En direct et provenance",
      "One set, one artist permission, timestamped and verifiable.",
      "Un set, une autorisation d’artiste, horodatée et vérifiable.");
    h += tile("consent_abstract.jpg", "#/consent", "Consent register", "Registre de consentement",
      "Default state is DENY. Nothing runs without a live entry.",
      "L’état par défaut est REFUS. Rien ne tourne sans une entrée active.");
    h += tile("montreal_skyline_dusk.jpg", "#/street", "Street density", "Densité de la rue",
      "Aggregate counts by block. No person table exists in the schema.",
      "Comptes agrégés par tronçon. Aucune table d’individus dans le schéma.");
    h += "</div>";
    return h;
  }

  function tile(file, href, en, fr, den, dfr) {
    return '<a class="card photo" href="' + href + '" style="display:block">' +
      IMG(file, en, fr, 'style="height:150px"') + '<span class="scrim"></span>' +
      '<span class="cap"><h2' + A(en, fr) + ">" + esc(tx(en, fr)) + "</h2>" +
      "<p" + A(den, dfr) + ">" + esc(tx(den, dfr)) + "</p></span></a>";
  }

  function scr_places() {
    var h = '<div class="photo fullbleed" style="margin:0">' +
      IMG("crescent_street_looking_down.jpg", "Rue Crescent streetscape", "Perspective de la rue Crescent", 'style="height:170px"') +
      '<span class="scrim"></span><span class="cap"><p class="eyebrow"' + A("Six venues", "Six établissements") + ">Six venues</p>" +
      "<h2" + A("Places on Crescent", "Les lieux de Crescent") + ">Places on Crescent</h2>" +
      "<p" + A("Every card is built from the venue’s own published information.",
        "Chaque fiche est bâtie à partir des informations publiées par le lieu lui-même.") +
      ">Every card is built from the venue’s own published information.</p></span></div>";
    h += '<div class="pad" style="padding-top:12px">';
    VENUES.forEach(function (v) { h += venueCard(v); });
    h += "</div>";
    return h;
  }

  function scr_venue(slug) {
    var v = bySlug(slug);
    if (!v) return scr_places();
    var h = '<div class="photo">' + IMG(v.photo, v.name, v.name, 'style="height:240px"') +
      '<span class="scrim"></span><span class="cap">' +
      (v.anchor ? '<p class="eyebrow"' + A("First place twinned", "Premier lieu jumelé") + ">First place twinned</p>" : "") +
      "<h2 style=\"font-size:24px\">" + esc(v.name) + "</h2>" +
      '<p>' + esc(v.address) + "</p></span></div>";

    h += '<div class="pad" style="padding-top:10px">';
    h += back("#/places", "All places", "Tous les lieux");
    h += "<p" + A(v.blurb_en, v.blurb_fr) + ">" + esc(tx(v.blurb_en, v.blurb_fr)) + "</p>";
    h += '<div class="card cardpad" style="margin-top:10px">';
    h += '<div class="kv"><div class="k"' + A("Hours", "Heures") + '>Hours</div><div class="v"' +
      A(v.hours, v.hours_fr) + ">" + esc(tx(v.hours, v.hours_fr)) + "</div></div>";
    h += '<div class="kv"><div class="k"' + A("Known for", "Reconnu pour") + '>Known for</div><div class="v"' +
      A(v.known_for, v.known_for_fr) + ">" + esc(tx(v.known_for, v.known_for_fr)) + "</div></div>";
    h += '<div class="kv"><div class="k"' + A("Address", "Adresse") + '>Address</div><div class="v">' + esc(v.address) + "</div></div>";
    h += '<div class="kv"><div class="k"' + A("Source", "Source") + '>Source</div><div class="v"><span' +
      A("The venue\u2019s own page:", "La page du lieu :") + ">" + esc(tx("The venue\u2019s own page:", "La page du lieu :")) +
      '</span> <a href="' + esc(v.source_url) + '" target="_blank" rel="noopener">' +
      esc(v.source_url.replace(/^https?:\/\//, "")) + "</a></div></div>";
    h += "</div>";

    /* gallery */
    if (v.gallery && v.gallery.length) {
      h += '<div class="gal" style="margin-top:10px">';
      v.gallery.forEach(function (g) { h += IMG(g, v.name + " — atmosphere", v.name + " — ambiance"); });
      h += "</div>";
    }

    /* tonight's listing, from the nightly digest */
    var dg = digestFor(v.slug);
    h += '<div style="margin-top:14px"><h2' + A("Tonight", "Ce soir") + ">Tonight</h2>";
    h += '<div class="card cardpad">';
    if (dg) {
      h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="livedot"><i></i>LIVE</span>' +
        statusChip(dg.status) + '<span class="tiny" style="margin-left:auto">' + esc(checkedTime(dg)) + " EDT</span></div>";
      if (!dg.signals.length) {
        h += '<p class="sub"' + A("Nothing new was published for tonight.", "Rien de neuf n’a été publié pour ce soir.") +
          ">Nothing new was published for tonight.</p>";
      }
      dg.signals.forEach(function (g) {
        h += '<div class="sig">' + signalType(g.type) + unverifiedTag(g.confidence) +
          "<p style=\"margin:2px 0 0\">" + sigText(g) + "</p>" +
          '<p class="src">' + S("Source:", "Source :") + ' <a href="' + esc(g.source_url) + '" target="_blank" rel="noopener">' +
          esc(String(g.source_url).replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</a> · " + confLine(g) + "</p></div>";
      });
    } else {
      h += '<p class="sub"' + A("No digest entry for this venue tonight.", "Aucune entrée du digest pour ce lieu ce soir.") +
        ">No digest entry for this venue tonight.</p>";
    }
    h += "</div></div>";

    h += '<div style="margin-top:14px">' + menuBlock(v) + "</div>";
    h += '<div style="margin-top:14px"><h2' + A("Order", "Commander") + ">Order</h2>" + deliveryBlock(v) + "</div>";

    h += '<div style="margin-top:14px"><h2' + A("This venue in the twin", "Ce lieu dans le jumeau") + ">This venue in the twin</h2>" +
      '<div class="stack">' +
      tile("room_scan.jpg", "#/room", "3D room scan", "Numérisation 3D de la salle",
        "Mesh and texture, no people in frame.", "Maillage et texture, sans personne dans le champ.") +
      tile("stage_set.jpg", "#/live", "Tonight’s live set", "Le set de ce soir",
        "Captured only with the artist’s written permission.", "Capté uniquement avec l’autorisation écrite de l’artiste.") +
      "</div></div>";

    h += '<p class="tiny" style="margin-top:12px"' + A("Hours, menu and blurb are read from the venue’s own published pages. This venue pays nothing and does nothing.",
      "Heures, menu et description sont lus sur les pages publiées par le lieu. Ce lieu ne paie rien et n’a rien à faire.") +
      ">Hours, menu and blurb are read from the venue’s own published pages. This venue pays nothing and does nothing.</p>";
    h += "</div>";
    return h;
  }

  function scr_live() {
    var h = '<div class="photo">' + IMG("live_music_stage_guitarist.jpg", "Musician on a small stage under coloured light", "Musicien sur une petite scène sous des lumières colorées", 'style="height:230px;object-position:center 30%"') +
      '<span class="scrim"></span><span class="cap"><p class="eyebrow"><span class="livedot"><i></i>LIVE</span> · ' +
      esc(tx("On now", "En cours")) + '</p><h2' + A("Live tonight", "En direct ce soir") + ">Live tonight</h2>" +
      "<p" + A("Three rooms with something on. Each capture is permissioned, framed on the stage only.",
        "Trois salles actives. Chaque captation est autorisée et cadrée sur la scène uniquement.") +
      ">Three rooms with something on.</p></span></div>";

    h += '<div class="pad" style="padding-top:12px" class="stack">';
    var acts = [
      { slug: "hurleys", img: "stage_set.jpg", en: "Trad session", fr: "Session trad",
        d_en: "21:30 · main floor · trio", d_fr: "21 h 30 · rez-de-chaussée · trio", rel: 22 },
      { slug: "brutopia", img: "live_music_stage_guitarist.jpg", en: "House band", fr: "Groupe maison",
        d_en: "22:00 · back room · blues four-piece", d_fr: "22 h · salle arrière · quatuor blues", rel: 95 },
      { slug: "brass-door", img: "comedy_club_stage.jpg", en: "Open mic & comedy", fr: "Micro ouvert et humour",
        d_en: "23:00 · late kitchen open until 03:00", d_fr: "23 h · cuisine tardive jusqu’à 3 h", rel: 210 }
    ];
    acts.forEach(function (a) {
      var v = V[a.slug];
      h += '<a class="card photo" style="display:block;margin-bottom:12px" href="#/venue/' + a.slug + '">' +
        IMG(a.img, a.en, a.fr, 'style="height:160px;object-position:center 35%"') + '<span class="scrim"></span>' +
        '<span class="cap"><p class="eyebrow"><span class="livedot"><i></i>LIVE</span> · <span data-rel="' + a.rel + '"></span></p>' +
        "<h2" + A(a.en, a.fr) + ">" + esc(tx(a.en, a.fr)) + "</h2>" +
        "<p>" + esc(v.name) + " · <span" + A(a.d_en, a.d_fr) + ">" + esc(tx(a.d_en, a.d_fr)) + "</span></p></span></a>";
    });

    h += '<h2 style="margin-top:16px"' + A("Provenance of the capture", "Provenance de la captation") + ">Provenance of the capture</h2>";
    h += '<div class="card cardpad">' +
      '<div class="kv"><div class="k">SHA-256</div><div class="v" style="word-break:break-all">9f2c4ab7e1d0…83bc5e</div></div>' +
      '<div class="kv"><div class="k"' + A("Timestamp", "Horodatage") + '>Timestamp</div><div class="v">2026-08-07T02:14:33Z</div></div>' +
      '<div class="kv"><div class="k"' + A("Device", "Appareil") + '>Device</div><div class="v">EVG-CAM-02 · ' +
        "<span" + A("fixed stage rig", "rig fixe scène") + ">fixed stage rig</span></div></div>" +
      '<div class="kv"><div class="k"' + A("Register", "Registre") + '>Register</div><div class="v" style="word-break:break-all">crescent://reg/brassdoor/0142</div></div>' +
      '<div class="kv"><div class="k"' + A("Residency", "Résidence") + '>Residency</div><div class="v">Canada Central</div></div>' +
      "</div>";
    h += '<p class="note" style="margin-top:10px"' + A("The frame stops at the edge of the stage. No table and no customer’s face enters the capture. The artist holds the permission and it expires 2027-02-07.",
      "Le cadre s’arrête au bord de la scène. Aucune table, aucun visage de client n’entre dans la captation. L’artiste détient l’autorisation, qui expire le 2027-02-07.") +
      ">The frame stops at the edge of the stage.</p>";
    h += '<a class="btn ghost sm" style="margin-top:10px" href="#/consent"' + A("See the consent register", "Voir le registre de consentement") + ">See the consent register</a>";
    h += "</div>";
    return h;
  }

  function scr_scan() {
    var st = digestStats();
    var h = '<div class="photo">' + IMG("downtown_montreal_night_art.jpg", "Downtown Montréal at night", "Le centre-ville de Montréal la nuit", 'style="height:170px;object-position:center 55%"') +
      '<span class="scrim"></span><span class="cap"><p class="eyebrow"><span class="livedot"><i></i>LIVE</span> · ' +
      esc(tx("Runs every night", "Chaque nuit")) + "</p><h2" + A("Nightly scan", "Balayage nocturne") + ">Nightly scan</h2>" +
      "<p" + A("Last run " + runClock() + " EDT · " + st.count + " venues · " + st.nw + " new specials",
               "Dernier passage " + runClockFR() + " HAE · " + st.count + " lieux · " + st.nw + " nouveautés") +
      ">Last run " + runClock() + " EDT</p></span></div>";

    h += '<div class="pad" style="padding-top:12px">';
    h += '<p class="note"><b' + A("No venue pays for this, and no venue has to do anything.",
      "Aucun établissement ne paie pour ceci, et aucun établissement n’a quoi que ce soit à faire.") +
      ">No venue pays for this, and no venue has to do anything.</b> " +
      "<span" + A("The twin reads what they already publish on their own site or social page. Nothing is installed, nothing is signed, nothing is invoiced.",
        "Le jumeau lit ce qu’ils publient déjà sur leur propre site ou page sociale. Rien à installer, rien à signer, rien à facturer.") +
      ">The twin reads what they already publish.</span></p>";

    h += '<div class="grid3" style="margin-top:12px">' +
      '<div class="metric"><div class="n">' + st.nw + '</div><div class="k"' + A("New", "Nouveau") + ">New</div></div>" +
      '<div class="metric"><div class="n">' + st.unchanged + '</div><div class="k"' + A("Unchanged", "Inchangé") + ">Unchanged</div></div>" +
      '<div class="metric"><div class="n">' + st.blocked + '</div><div class="k"' + A("Not read", "Non lu") + ">Not read</div></div>" +
      "</div>";
    h += '<p class="tiny" style="margin-top:6px" data-rel="12"></p>';

    h += '<h2 style="margin-top:16px"' + A("Scan log", "Journal de balayage") + ">Scan log</h2>";
    h += '<div class="card">';
    TONIGHT.venues.forEach(function (r) {
      var v = V[r.slug];
      var name = (v && v.name) || r.name || r.slug;
      h += '<div class="scanrow"><div class="top"><h3>' + esc(name) + "</h3>" + statusChip(r.status) + "</div>";
      if (!r.signals.length) {
        h += '<p class="found"' + A("Nothing found on this pass.", "Rien trouvé lors de ce passage.") + ">Nothing found on this pass.</p>";
      }
      r.signals.forEach(function (g) {
        h += '<div class="sig">' + signalType(g.type) + unverifiedTag(g.confidence) +
          '<p class="found">' + sigText(g) + "</p>" +
          '<p class="src">' + S("Source:", "Source :") + ' <a href="' + esc(g.source_url) + '" target="_blank" rel="noopener">' +
          esc(String(g.source_url).replace(/^https?:\/\//, "").replace(/\/$/, "")) + "</a> · " +
          '<span class="sub" style="font-size:12px">' + confLine(g) + "</span></p></div>";
      });
      h += '<p class="src">' + S("Checked", "Vérifié") + " " + esc(checkedTime(r)) + " EDT</p>";
      if (r.status === "source_unreachable") {
        h += '<p class="src"' + A("Shown as unreachable rather than filled in with a guess.",
          "Affiché comme injoignable plutôt que comblé par une supposition.") + ">Shown as unreachable rather than filled in with a guess.</p>";
      }
      if (r.status === "robots_disallowed") {
        h += '<p class="src"' + A("The venue’s site asks automated readers not to fetch this section. We respect that and read nothing.",
          "Le site du lieu demande aux lecteurs automatisés de ne pas consulter cette section. Nous le respectons et ne lisons rien.") +
          ">The venue’s site asks automated readers not to fetch this section.</p>";
      }
      h += '<div class="acts">' + (v ? '<a href="#/venue/' + v.slug + '"' + A("Open venue", "Ouvrir le lieu") + ">Open venue</a>" : "") +
        '<button type="button" data-toast="1"' + A("Correct this", "Corriger ceci") + ">Correct this</button></div></div>";
    });
    h += "</div>";
    h += '<p class="tiny" style="margin-top:10px"' + A("Rows that could not be read are shown as such. A venue can ask in writing to be removed from the scan and it stops the same night. Nothing here costs the venue anything.",
      "Les lignes qui n’ont pu être lues sont affichées comme telles. Un établissement peut demander par écrit d’être retiré du balayage; cela cesse la nuit même. Rien de tout ceci ne coûte quoi que ce soit au lieu.") +
      ">Rows that could not be read are shown as such.</p>";
    h += '<p class="tiny" style="margin-top:6px"' + A("Digest read from data/tonight.json, written by the scan. If that file is missing or malformed the app falls back to bundled demo content.",
      "Digest lu depuis data/tonight.json, écrit par le balayage. Si ce fichier est absent ou mal formé, l’appli revient au contenu de démonstration intégré.") +
      ">Digest read from data/tonight.json.</p>";
    h += '<a class="btn ghost sm" style="margin-top:10px" href="#/credits"' + A("Where every fact comes from", "D’où vient chaque information") + ">Where every fact comes from</a>";
    h += "</div>";
    return h;
  }

  /* ---- account ---- */
  var TOGGLES = [
    { id: "loc", en: "Location sharing", fr: "Partage de position",
      d_en: "Shows you what’s on within two blocks. Stored as a rounded area, never a track history.",
      d_fr: "Vous montre ce qui se passe dans un rayon de deux coins de rue. Conservé comme une zone arrondie, jamais comme un historique de déplacements.",
      sub: true },
    { id: "media", en: "Photo & video sharing", fr: "Partage de photos et vidéos",
      d_en: "You choose which room and which audience, per post. Faces of other people are removed before anything is stored.",
      d_fr: "Vous choisissez la salle et le public, publication par publication. Les visages des autres personnes sont retirés avant tout stockage." },
    { id: "presence", en: "Anonymous presence count", fr: "Comptage de présence anonyme",
      d_en: "Adds +1 to a rounded street count. Never tied to you.",
      d_fr: "Ajoute +1 à un compte de rue arrondi. Jamais rattaché à vous." },
    { id: "face", en: "Facial recognition", fr: "Reconnaissance faciale",
      d_en: "Unavailable by design. There is no code path that can turn this on, for anyone, including us.",
      d_fr: "Indisponible par conception. Aucun chemin de code ne permet de l’activer, pour qui que ce soit, nous inclus.",
      disabled: true }
  ];

  function scr_account() {
    var h = '<div class="photo">' + IMG("terrace_night.jpg", "Night terrace with string lights", "Terrasse de nuit avec guirlandes lumineuses", 'style="height:150px"') +
      '<span class="scrim"></span><span class="cap"><p class="eyebrow"' + A("My account", "Mon compte") + ">My account</p>" +
      "<h2" + A("Sign in", "Se connecter") + ">Sign in</h2></span></div>";

    h += '<div class="pad" style="padding-top:12px">';
    h += '<div class="card cardpad"><p class="tiny"' + A("Wireframe stub — nothing is sent anywhere.",
      "Élément de maquette — rien n’est envoyé nulle part.") + ">Wireframe stub — nothing is sent anywhere.</p>" +
      '<label class="tiny" for="acc-email" style="display:block;margin:8px 0 4px"' + A("Email", "Courriel") + ">Email</label>" +
      '<input id="acc-email" type="email" inputmode="email" ' +
      'style="width:100%;min-height:48px;background:#0a0a0a;border:1px solid #262626;border-radius:10px;color:#fff;padding:0 12px;font-size:16px" ' +
      'data-ph-en="you@example.com" data-ph-fr="vous@exemple.com" placeholder="you@example.com">' +
      '<button class="btn" type="button" style="margin-top:10px" data-toast="1"' +
      A("Send me a sign-in link", "M’envoyer un lien de connexion") + ">Send me a sign-in link</button></div>";

    h += '<h2 style="margin-top:16px"' + A("What you allow", "Ce que vous autorisez") + ">What you allow</h2>";
    h += '<p class="tiny"' + A("Everything is off until you turn it on. Each permission expires on its own.",
      "Tout est désactivé tant que vous ne l’activez pas. Chaque permission expire d’elle-même.") +
      ">Everything is off until you turn it on.</p>";
    h += '<div class="card cardpad" style="margin-top:10px">';
    TOGGLES.forEach(function (t) {
      h += '<div class="swrow"><div class="txt"><h3' + A(t.en, t.fr) + ">" + esc(tx(t.en, t.fr)) + "</h3>" +
        "<p" + A(t.d_en, t.d_fr) + ">" + esc(tx(t.d_en, t.d_fr)) + "</p>";
      if (t.disabled) {
        h += '<p class="exp" style="color:#e87722;font-weight:700"' + A("Unavailable by design", "Indisponible par conception") + ">Unavailable by design</p>";
      } else {
        h += '<p class="exp"' + A("Expires in 12 months", "Expire dans 12 mois") + ">Expires in 12 months</p>";
      }
      if (t.sub) {
        h += '<div class="seg" id="loc-seg" hidden>' +
          '<button type="button" data-locmode="open" aria-pressed="true"' + A("While the app is open", "Quand l’appli est ouverte") + ">While the app is open</button>" +
          '<button type="button" data-locmode="always" aria-pressed="false"' + A("Always", "Toujours") + ">Always</button></div>";
      }
      h += "</div>";
      h += '<button class="switch" type="button" role="switch" aria-checked="false" data-acc="' + t.id + '"' +
        (t.disabled ? " disabled" : "") + ' aria-label="' + esc(tx(t.en, t.fr)) + '"></button>';
      h += "</div>";
    });
    h += "</div>";

    h += '<p class="tiny" style="margin-top:10px" id="acc-summary"></p>';
    h += '<button class="btn ghost" type="button" id="revoke-all" style="margin-top:10px"' +
      A("Revoke everything", "Tout révoquer") + ">Revoke everything</button>";
    h += '<p class="tiny" style="margin-top:8px"' + A("Revoking is instant and needs no reason. Nothing you revoke is kept “just in case”.",
      "La révocation est immédiate et sans justification. Rien de révoqué n’est conservé « au cas où ».") +
      ">Revoking is instant and needs no reason.</p>";
    h += '<a class="btn line sm" style="margin-top:12px" href="#/consent"' + A("Venue-side consent register", "Registre de consentement du lieu") + ">Venue-side consent register</a>";
    h += "</div>";
    return h;
  }

  /* ---- consent ---- */
  var CONSENTS = [
    { id: "c1", en: "3D model of the room", fr: "Modèle 3D de la salle",
      d_en: "Captured once, with nobody in frame.", d_fr: "Capté une seule fois, sans personne dans le champ." },
    { id: "c2", en: "Stage capture", fr: "Captation de scène",
      d_en: "Only with the artist’s written permission.", d_fr: "Uniquement avec l’autorisation écrite de l’artiste." },
    { id: "c3", en: "Anonymous presence counts", fr: "Comptes d’affluence anonymes",
      d_en: "Aggregate numbers only, rounded to the nearest ten.", d_fr: "Nombres agrégés seulement, arrondis à la dizaine." },
    { id: "c4", en: "Facial recognition", fr: "Reconnaissance faciale",
      d_en: "Out of scope — unavailable by design.", d_fr: "Hors périmètre — indisponible par conception.", disabled: true }
  ];

  function scr_consent() {
    var h = '<div class="photo">' + IMG("consent_abstract.jpg", "Abstract glowing padlock form", "Forme abstraite de cadenas lumineux", 'style="height:190px;object-position:center 45%"') +
      '<span class="scrim"></span><span class="cap"><p class="eyebrow"' + A("The backbone", "La colonne vertébrale") + ">The backbone</p>" +
      "<h2" + A("Consent register", "Registre de consentement") + ">Consent register</h2>" +
      "<p" + A("Nothing is captured, published or kept without a live entry here.",
        "Rien n’est capté, publié ou conservé sans une entrée active ici.") +
      ">Nothing is captured, published or kept without a live entry here.</p></span></div>";

    h += '<div class="pad" style="padding-top:12px">';
    h += '<div class="card cardpad"><div style="display:flex;align-items:center;gap:8px">' +
      '<div style="flex:1"><h3>The Brass Door Pub</h3><p class="tiny">' + esc(tx("Register entry 0142", "Entrée de registre 0142")) + "</p></div>" +
      '<span class="chip" id="consent-state" aria-pressed="false"' + A("Deny by default", "Refus par défaut") + ">Deny by default</span></div></div>";

    h += '<h2 style="margin-top:14px"' + A("Permissions", "Permissions") + ">Permissions</h2>";
    h += '<div class="card cardpad">';
    CONSENTS.forEach(function (c) {
      h += '<div class="swrow"><div class="txt"><h3' + A(c.en, c.fr) + ">" + esc(tx(c.en, c.fr)) + "</h3>" +
        "<p" + A(c.d_en, c.d_fr) + ">" + esc(tx(c.d_en, c.d_fr)) + "</p></div>" +
        '<button class="switch" type="button" role="switch" aria-checked="false" data-consent="' + c.id + '"' +
        (c.disabled ? " disabled" : "") + ' aria-label="' + esc(tx(c.en, c.fr)) + '"></button></div>';
    });
    h += "</div>";

    h += '<h2 style="margin-top:14px"' + A("Scope of each entry", "Portée de chaque entrée") + ">Scope of each entry</h2>";
    h += '<div class="card cardpad">' +
      '<div class="kv"><div class="k"' + A("Audience", "Public") + '>Audience</div><div class="v">' +
      '<div class="seg" style="margin:0"><button type="button" data-aud="1" aria-pressed="true"' + A("This room", "Cette salle") + ">This room</button>" +
      '<button type="button" data-aud="1" aria-pressed="false"' + A("The street", "La rue") + ">The street</button>" +
      '<button type="button" data-aud="1" aria-pressed="false"' + A("Public", "Public") + ">Public</button></div></div></div>" +
      '<div class="kv"><div class="k"' + A("Purpose", "Finalité") + '>Purpose</div><div class="v"' +
      A("Showing tonight’s room and tonight’s act to people on Crescent Street.",
        "Montrer la salle et la prestation de ce soir aux gens de la rue Crescent.") +
      ">Showing tonight’s room and tonight’s act to people on Crescent Street.</div></div>" +
      '<div class="kv"><div class="k"' + A("Term", "Durée") + '>Term</div><div class="v"' +
      A("12 months, then it lapses automatically", "12 mois, puis expiration automatique") +
      ">12 months, then it lapses automatically</div></div>" +
      '<div class="kv"><div class="k"' + A("Residency", "Résidence") + '>Residency</div><div class="v">Canada Central / Canada East</div></div>' +
      "</div>";
    h += '<button class="btn ghost" type="button" id="consent-revoke" style="margin-top:12px"' +
      A("Revoke everything", "Tout révoquer") + ">Revoke everything</button>";
    h += '<p class="tiny" style="margin-top:8px"' + A("The venue can revoke at any time and the twin goes dark for that venue the same night. Facial recognition cannot be enabled here or anywhere else.",
      "Le lieu peut révoquer à tout moment; le jumeau s’éteint pour ce lieu la nuit même. La reconnaissance faciale ne peut être activée ni ici ni ailleurs.") +
      ">The venue can revoke at any time.</p>";
    h += "</div>";
    return h;
  }

  function scr_room() {
    var h = '<div class="photo">' + IMG("room_scan.jpg", "Point-cloud reconstruction of a pub interior", "Reconstruction en nuage de points d’un intérieur de pub", 'style="height:220px"') +
      '<span class="scrim"></span><span class="cap"><p class="eyebrow"' + A("The place, in volume", "Le lieu, en volume") + ">The place, in volume</p>" +
      "<h2" + A("The room in 3D", "La salle en 3D") + ">The room in 3D</h2>" +
      "<p" + A("A 3D model of the pub, captured once, with nobody in frame.",
        "Un modèle 3D du pub, capté une seule fois, sans personne dans le champ.") +
      ">A 3D model of the pub, captured once, with nobody in frame.</p></span></div>";
    h += '<div class="pad" style="padding-top:12px">';
    h += back("#/venue/brass-door", "The Brass Door Pub", "The Brass Door Pub");
    h += '<div class="chips" style="margin-top:4px">' +
      '<button class="chip" type="button" data-view="bar" aria-pressed="true"' + A("Bar", "Bar") + ">Bar</button>" +
      '<button class="chip" type="button" data-view="terrace" aria-pressed="false"' + A("Terrace", "Terrasse") + ">Terrace</button>" +
      '<button class="chip" type="button" data-view="stage" aria-pressed="false"' + A("Stage", "Scène") + ">Stage</button>" +
      '<button class="chip" type="button" data-view="tables" aria-pressed="false"' + A("Tables", "Tables") + ">Tables</button></div>";
    h += '<p class="tiny" style="margin-top:8px" id="view-label"></p>';
    h += '<div class="card" style="margin-top:8px;overflow:hidden">' +
      '<div class="photo">' + IMG("pub_interior.jpg", "Pub interior reference view", "Vue de référence de l’intérieur du pub", 'id="view-img" style="height:180px"') +
      '<span class="scrim"></span></div></div>';
    h += '<p class="note" style="margin-top:10px"' + A("The 3D model belongs to the pub. EVEglyphDesign hosts it; the pub can export it or delete it at any time.",
      "Le modèle 3D appartient au pub. EVEglyphDesign l’héberge; le pub peut l’exporter ou le supprimer en tout temps.") +
      ">The 3D model belongs to the pub.</p>";

    h += '<h2 style="margin-top:14px"' + A("Free tables", "Tables libres") + ">Free tables</h2>";
    h += '<p class="tiny"' + A("Declared by the pub · refreshed by hand", "Déclaré par le pub · rafraîchi manuellement") +
      ">Declared by the pub · refreshed by hand</p>";
    h += '<div class="card cardpad" style="margin-top:8px">';
    [["Table 4 — banquette", "Table 4 — banquette", "2 seats · near the bar", "2 places · près du bar", "Free", "Libre"],
     ["Table 7 — window", "Table 7 — fenêtre", "4 seats · view on Crescent", "4 places · vue sur Crescent", "Free", "Libre"],
     ["Terrace 2", "Terrasse 2", "4 seats · seasonal", "4 places · saisonnière", "Taken", "Occupée"],
     ["Table 11 — back room", "Table 11 — salle arrière", "6 seats · near the stage", "6 places · près de la scène", "Held", "Réservée"]
    ].forEach(function (r) {
      h += '<div class="kv" style="align-items:center"><div class="v"><h3' + A(r[0], r[1]) + ">" + esc(tx(r[0], r[1])) + "</h3>" +
        '<p class="tiny"' + A(r[2], r[3]) + ">" + esc(tx(r[2], r[3])) + "</p></div>" +
        '<span class="chip' + (r[4] === "Free" ? " new" : "") + '"' + A(r[4], r[5]) + ">" + esc(tx(r[4], r[5])) + "</span></div>";
    });
    h += "</div>";
    h += '<button class="btn" type="button" style="margin-top:12px" data-toast="1"' + A("Hold a table", "Réserver une table") + ">Hold a table</button>";
    h += '<p class="tiny" style="margin-top:8px"' + A("The hold goes straight to the pub. EVEglyphDesign keeps neither your name nor your number after the night.",
      "La réservation part directement au pub. EVEglyphDesign ne conserve ni votre nom ni votre numéro après la soirée.") +
      ">The hold goes straight to the pub.</p>";
    h += "</div>";
    return h;
  }

  function scr_street() {
    var h = '<div class="photo">' + IMG("montreal_skyline_dusk.jpg", "Montréal skyline at dusk", "Silhouette de Montréal au crépuscule", 'style="height:200px"') +
      '<span class="scrim"></span><span class="cap"><p class="eyebrow"' + A("Anonymous density only", "Densité anonyme seulement") + ">Anonymous density only</p>" +
      "<h2" + A("The street", "La rue") + ">The street</h2>" +
      "<p" + A("Rue Crescent between Sherbrooke and de Maisonneuve. Numbers, never people.",
        "Rue Crescent, entre Sherbrooke et de Maisonneuve. Des nombres, jamais des gens.") +
      ">Rue Crescent between Sherbrooke and de Maisonneuve.</p></span></div>";
    h += '<div class="pad" style="padding-top:12px">';
    h += '<div class="card cardpad"><div style="display:flex;align-items:center;gap:8px">' +
      '<span class="lbl" style="font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#e87722"' +
      A("Dominant flow", "Flux dominant") + ">Dominant flow</span><span class=\"livedot\"><i></i>LIVE</span></div>" +
      '<div style="display:flex;align-items:baseline;gap:8px;margin-top:4px"><span style="font-size:34px;font-weight:800;letter-spacing:-.02em" id="street-total">~40</span>' +
      "<span class=\"sub\"" + A("people · heading north", "personnes · direction nord") + ">people · heading north</span></div>" +
      '<div class="bar" style="margin-top:8px"><i id="street-fill" style="width:64%"></i></div>' +
      '<p class="tiny" style="margin-top:6px" data-rel="8"></p></div>';

    h += '<div class="card cardpad" style="margin-top:12px">';
    [["North segment", "Tronçon nord", "~18", 45],
     ["Outside 2171", "Devant le 2171", "~12", 30],
     ["South segment", "Tronçon sud", "~10", 25]].forEach(function (r) {
      h += '<div style="padding:8px 0;border-bottom:1px solid #262626">' +
        '<div style="display:flex"><span style="flex:1;font-size:14px"' + A(r[0], r[1]) + ">" + esc(tx(r[0], r[1])) + "</span>" +
        '<b style="font-size:14px">' + r[2] + "</b></div>" +
        '<div class="bar" style="margin-top:5px"><i style="width:' + r[3] + '%"></i></div></div>';
    });
    h += "</div>";

    h += '<div class="grid2" style="margin-top:12px">' +
      '<div class="metric"><div class="n">5 min</div><div class="k"' + A("Rolling window", "Fenêtre glissante") + ">Rolling window</div></div>" +
      '<div class="metric"><div class="n">10</div><div class="k"' + A("Rounded to nearest", "Arrondi à") + ">Rounded to nearest</div></div>" +
      '<div class="metric"><div class="n">72 h</div><div class="k"' + A("Retention, then deleted", "Rétention, puis suppression") + ">Retention</div></div>" +
      '<div class="metric"><div class="n">0</div><div class="k"' + A("Person records", "Fiches individuelles") + ">Person records</div></div>" +
      "</div>";

    h += '<h2 style="margin-top:14px"' + A("Query guarantee", "Garantie de requête") + ">Query guarantee</h2>";
    h += '<p class="note"><b' + A("No query ever returns a person.", "Aucune requête ne retourne une personne.") +
      ">No query ever returns a person.</b> <span" +
      A("The schema contains no table of individuals. You cannot ask “who was there” — the question does not exist in the system. Counts below five are dropped rather than shown.",
        "Le schéma ne contient aucune table d’individus. On ne peut pas demander « qui était là » : la question n’existe pas dans le système. Les comptes sous cinq sont supprimés plutôt qu’affichés.") +
      ">The schema contains no table of individuals.</span></p>";
    h += '<div class="gal" style="margin-top:12px">' +
      IMG("crescent_street_rowhouses.jpg", "Crescent Street rowhouses", "Maisons en rangée de la rue Crescent") +
      IMG("downtown_montreal_night_art.jpg", "Downtown Montréal at night", "Centre-ville de Montréal la nuit") + "</div>";
    h += '<a class="btn ghost sm" style="margin-top:12px" href="#/governance"' + A("How this is governed →", "Comment c’est encadré →") + ">How this is governed →</a>";
    h += "</div>";
    return h;
  }

  function scr_governance() {
    var h = '<div class="photo">' + IMG("montreal_skyline_day_mountroyal.jpg", "Montréal from Mount Royal", "Montréal depuis le mont Royal", 'style="height:170px"') +
      '<span class="scrim"></span><span class="cap"><p class="eyebrow"' + A("Who decides", "Qui décide") + ">Who decides</p>" +
      "<h2" + A("Governance", "Gouvernance") + ">Governance</h2>" +
      "<p" + A("A council of three voices. No decision about the twin is taken without them.",
        "Un conseil de trois voix. Aucune décision sur le jumeau ne se prend sans elles.") +
      ">A council of three voices.</p></span></div>";
    h += '<div class="pad" style="padding-top:12px">';
    h += '<h2' + A("The council", "Le conseil") + ">The council</h2>";
    h += '<div class="card cardpad">';
    [["The venue", "Le lieu", "Owner of the twinned pub · veto on any use", "Propriétaire du pub jumelé · droit de veto sur tout usage", "Veto", "Veto"],
     ["Québec legal counsel", "Conseil juridique du Québec", "Law 25, privacy, contract law · permanent seat", "Loi 25, vie privée, droit des contrats · siège permanent", "Seat", "Siège"],
     ["A neighbourhood voice", "Une voix du quartier", "Ville-Marie resident · 2-year rotating mandate", "Résidente ou résident de Ville-Marie · mandat rotatif de 2 ans", "Seat", "Siège"]
    ].forEach(function (r) {
      h += '<div class="kv" style="align-items:center"><div class="v"><h3' + A(r[0], r[1]) + ">" + esc(tx(r[0], r[1])) + "</h3>" +
        '<p class="tiny"' + A(r[2], r[3]) + ">" + esc(tx(r[2], r[3])) + "</p></div>" +
        '<span class="chip new"' + A(r[4], r[5]) + ">" + esc(tx(r[4], r[5])) + "</span></div>";
    });
    h += "</div>";

    h += '<h2 style="margin-top:14px"' + A("Where the data lives", "Où vivent les données") + ">Where the data lives</h2>";
    h += '<div class="card cardpad">';
    [["Residency", "Résidence", "Canada Central and Canada East. Nothing leaves the country.", "Canada Central et Canada East. Rien ne quitte le pays."],
     ["Keys", "Clés", "Customer-managed keys. The venue holds its own key and can rotate it.", "Clés gérées par le client. Le lieu détient sa propre clé et peut la faire tourner."],
     ["Audit log", "Journal d’audit", "Every read is logged and readable by the venue, not only by us.", "Chaque lecture est journalisée et lisible par le lieu, pas seulement par nous."],
     ["Exit right", "Droit de sortie", "Full export in open formats, then deletion within 30 days, on request.", "Export complet en formats ouverts, puis suppression sous 30 jours, sur demande."],
     ["Reinvestment", "Réinvestissement", "A fixed share of revenue returns to the street: local hiring and neighbourhood projects.", "Une part fixe des revenus revient à la rue : embauche locale et projets de quartier."]
    ].forEach(function (r) {
      h += '<div class="kv"><div class="k"' + A(r[0], r[1]) + ">" + esc(tx(r[0], r[1])) + '</div><div class="v"' +
        A(r[2], r[3]) + ">" + esc(tx(r[2], r[3])) + "</div></div>";
    });
    h += "</div>";
    h += '<p class="note" style="margin-top:12px"' + A("No venue pays for the nightly scan and no venue has to do anything to be in it. Paid features, if any, are opt-in and priced in the open.",
      "Aucun établissement ne paie pour le balayage nocturne et aucun n’a à faire quoi que ce soit pour y figurer. Les fonctions payantes, s’il y en a, sont facultatives et affichées en clair.") +
      ">No venue pays for the nightly scan.</p>";
    h += '<a class="btn ghost sm" style="margin-top:12px" href="#/credits"' + A("Credits & sources", "Crédits et sources") + ">Credits &amp; sources</a>";
    h += "</div>";
    return h;
  }

  function scr_credits() {
    var h = '<div class="pad" style="padding-top:14px">';
    h += '<p class="eyebrow"' + A("Everything shown, sourced", "Tout ce qui est montré, sourcé") + ">Everything shown, sourced</p>";
    h += "<h1" + A("Credits & sources", "Crédits et sources") + ">Credits &amp; sources</h1>";
    h += '<p class="note"' + A("This is a wireframe built with demo data. Venue facts come from each venue’s own published pages, linked below. Photographs are credited to their photographers. Six images are AI-generated illustrations and are labelled as such.",
      "Ceci est une maquette bâtie avec des données de démonstration. Les informations sur les lieux proviennent des pages publiées par chaque établissement, liées ci-dessous. Les photographies sont créditées à leurs auteurs. Six images sont des illustrations générées par IA et sont étiquetées comme telles.") +
      ">This is a wireframe built with demo data.</p>";

    h += '<h2 style="margin-top:16px"' + A("Photographs", "Photographies") + ">Photographs</h2>";
    h += '<div class="card cardpad">';
    CREDITS.forEach(function (c) {
      h += '<div class="creditrow">' + IMG(c.filename, c.what_it_shows, c.what_it_shows) +
        '<div class="m"><h3>' + esc(c.filename) + "</h3>" +
        "<p>" + esc(c.photographer) + " · " + esc(c.license) + "</p>" +
        '<a href="' + esc(c.source_page_url) + '" target="_blank" rel="noopener">' + esc(c.source_page_url) + "</a></div></div>";
    });
    h += "</div>";

    h += '<h2 style="margin-top:16px"' + A("Illustrations, AI-generated", "Illustrations générées par IA") + ">Illustrations, AI-generated</h2>";
    h += '<div class="card cardpad">';
    GENERATED.forEach(function (g) {
      h += '<div class="creditrow">' + IMG(g.filename, g.what_it_shows, g.what_it_shows) +
        '<div class="m"><h3>' + esc(g.filename) + "</h3><p>" + esc(g.what_it_shows) + "</p>" +
        '<span class="aitag"' + A("Illustration, AI-generated", "Illustration générée par IA") + ">Illustration, AI-generated</span></div></div>";
    });
    h += "</div>";

    h += '<h2 style="margin-top:16px"' + A("Venue facts", "Informations sur les lieux") + ">Venue facts</h2>";
    h += '<div class="card cardpad">';
    VENUES.forEach(function (v) {
      h += '<div class="kv" style="display:block"><h3>' + esc(v.name) + "</h3>" +
        '<p class="tiny">' + S("Hours, address, blurb, known-for:", "Heures, adresse, description, reconnu pour :") +
        ' <a href="' + esc(v.source_url) + '" target="_blank" rel="noopener">' + esc(v.source_url) + "</a></p>" +
        '<p class="tiny">' + S("Menu:", "Menu :") + ' <a href="' + esc(v.menu_source_url) + '" target="_blank" rel="noopener">' +
        esc(v.menu_source_url) + "</a>" +
        (v.menu_source === "not published" ? " · <span" + A("prices not published", "prix non publiés") + ">prices not published</span>" : "") + "</p>" +
        (v.ubereats_url ? '<p class="tiny">' + S("Uber Eats:", "Uber Eats :") + ' <a href="' + esc(v.ubereats_url) +
          '" target="_blank" rel="noopener">' + esc(v.ubereats_url) + "</a></p>" : "") +
        "</div>";
    });
    h += "</div>";
    h += '<p class="tiny" style="margin-top:12px"' + A("Live counts, scan timestamps, table availability and the artist provenance record are demonstration values invented for this wireframe. No real person, device or camera is involved.",
      "Les comptes en direct, les horodatages de balayage, la disponibilité des tables et la fiche de provenance de l’artiste sont des valeurs de démonstration inventées pour cette maquette. Aucune personne, aucun appareil et aucune caméra réels ne sont impliqués.") +
      ">Live counts and scan timestamps are demonstration values.</p>";
    h += "</div>";
    return h;
  }

  /* ---------------- router ---------------- */
  var ROUTES = {
    "#/tonight": scr_tonight,
    "#/places": scr_places,
    "#/live": scr_live,
    "#/scan": scr_scan,
    "#/account": scr_account,
    "#/consent": scr_consent,
    "#/room": scr_room,
    "#/street": scr_street,
    "#/governance": scr_governance,
    "#/credits": scr_credits
  };

  var TABS = [
    ["#/tonight", "Tonight", "Ce soir", '<path d="M3 11.5 12 4l9 7.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10.5V20h12v-9.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linejoin="round"/>'],
    ["#/places", "Places", "Lieux", '<path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="2" fill="none"/>'],
    ["#/live", "Live", "Direct", '<circle cx="12" cy="12" r="3.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'],
    ["#/scan", "Scan", "Balayage", '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M4 12h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'],
    ["#/account", "Account", "Compte", '<circle cx="12" cy="8.5" r="3.5" stroke="currentColor" stroke-width="2" fill="none"/><path d="M5 20c0-3.6 3.1-5.5 7-5.5s7 1.9 7 5.5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>']
  ];

  function buildTabs() {
    var tb = document.getElementById("tabbar");
    tb.innerHTML = TABS.map(function (t) {
      return '<a href="' + t[0] + '" data-route="' + t[0] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + t[3] +
        "</svg><span" + A(t[1], t[2]) + ">" + esc(tx(t[1], t[2])) + "</span></a>";
    }).join("");
  }

  var SHEET_LINKS = [
    ["#/room", "3D room", "Salle 3D", "Mesh of the pub, no people", "Maillage du pub, sans personne"],
    ["#/consent", "Consent register", "Registre de consentement", "Default DENY, per-purpose", "REFUS par défaut, par finalité"],
    ["#/street", "Street density", "Densité de la rue", "Anonymous counts only", "Comptes anonymes seulement"],
    ["#/governance", "Governance", "Gouvernance", "Council, residency, exit right", "Conseil, résidence, droit de sortie"],
    ["#/credits", "Credits & sources", "Crédits et sources", "Every photo and every fact", "Chaque photo et chaque information"]
  ];
  function buildSheet() {
    document.getElementById("sheet-inner").innerHTML =
      '<p class="eyebrow"' + A("More screens", "Autres écrans") + ">More screens</p>" +
      SHEET_LINKS.map(function (l) {
        return '<a href="' + l[0] + '"><span' + A(l[1], l[2]) + ">" + esc(tx(l[1], l[2])) + "</span><br><span" +
          A(l[3], l[4]) + ">" + esc(tx(l[3], l[4])) + "</span></a>";
      }).join("") +
      '<button class="btn line sm" type="button" id="sheet-close" style="margin-top:10px"' +
      A("Close", "Fermer") + ">Close</button>";
  }

  var app = document.getElementById("app");

  function render() {
    var h = window.location.hash || "";
    var html, active = h;
    if (h.indexOf("#/venue/") === 0) {
      html = scr_venue(h.slice(8));
      active = "#/places";
    } else if (ROUTES[h]) {
      html = ROUTES[h]();
    } else {
      html = scr_tonight();
      active = "#/tonight";
    }
    app.innerHTML = '<section class="screen active">' + html + FOOTER + "</section>";
    Array.prototype.forEach.call(document.querySelectorAll("#tabbar a"), function (a) {
      var on = a.getAttribute("data-route") === active;
      a.classList.toggle("active", on);
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    closeSheet();
    wireScreen();
    applyLang();
    tickRel();
    window.scrollTo(0, 0);
  }

  /* ---------------- i18n apply ---------------- */
  function applyLang() {
    document.documentElement.setAttribute("lang", lang);
    Array.prototype.forEach.call(document.querySelectorAll("[data-en][data-fr]"), function (n) {
      var v = n.getAttribute("data-" + lang);
      if (v !== null) n.textContent = v;
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-alt-en]"), function (n) {
      n.setAttribute("alt", n.getAttribute("data-alt-" + lang) || "");
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-ph-en][data-ph-fr]"), function (n) {
      n.setAttribute("placeholder", n.getAttribute("data-ph-" + lang));
    });
    Array.prototype.forEach.call(document.querySelectorAll(".langtoggle button"), function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-lang") === lang));
    });
    updateViewLabel();
    updateAccSummary();
    updateConsentState();
    tickRel();
  }

  Array.prototype.forEach.call(document.querySelectorAll(".langtoggle button"), function (b) {
    b.addEventListener("click", function () {
      lang = b.getAttribute("data-lang");
      try { prefs.setItem(LS_LANG, lang); } catch (e) {}
      applyLang();
    });
  });

  /* ---------------- toast ---------------- */
  var toastEl = document.getElementById("toast"), toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.style.display = "block";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.style.display = "none"; }, 2800);
  }

  /* ---------------- sheet ---------------- */
  function openSheet() { document.getElementById("sheet").classList.add("open"); document.getElementById("menubtn").setAttribute("aria-expanded", "true"); }
  function closeSheet() { document.getElementById("sheet").classList.remove("open"); document.getElementById("menubtn").setAttribute("aria-expanded", "false"); }
  document.getElementById("menubtn").addEventListener("click", function () {
    var s = document.getElementById("sheet");
    if (s.classList.contains("open")) closeSheet(); else openSheet();
  });
  document.getElementById("sheet").addEventListener("click", function (e) {
    if (e.target.id === "sheet" || e.target.id === "sheet-close") closeSheet();
  });

  /* ---------------- per-screen wiring ---------------- */
  var VIEWS = {
    bar: ["pub_interior.jpg", "Bar — mesh + texture, no people", "Bar — maillage et texture, sans personne"],
    terrace: ["terrace_night.jpg", "Terrace — sidewalk, Crescent Street", "Terrasse — trottoir, rue Crescent"],
    stage: ["stage_set.jpg", "Stage — back room, stage frame", "Scène — salle arrière, cadre scène"],
    tables: ["room_scan.jpg", "Tables — numbered seating plan", "Tables — plan des places, numéroté"]
  };
  var currentView = "bar";
  function updateViewLabel() {
    var el = document.getElementById("view-label");
    if (!el) return;
    var v = VIEWS[currentView];
    el.textContent = tx("3D VIEW · ", "VUE 3D · ") + (lang === "fr" ? v[2] : v[1]);
    var im = document.getElementById("view-img");
    if (im) {
      im.setAttribute("src", "img/" + v[0]);
      var d = IMGDIM[v[0]];
      if (d) { im.setAttribute("width", d[0]); im.setAttribute("height", d[1]); }
      im.setAttribute("data-alt-en", v[1]);
      im.setAttribute("data-alt-fr", v[2]);
      im.setAttribute("alt", lang === "fr" ? v[2] : v[1]);
    }
  }

  var accState = { loc: false, media: false, presence: false, face: false };
  var locMode = "open";
  function updateAccSummary() {
    var el = document.getElementById("acc-summary");
    if (!el) return;
    var n = 0;
    for (var k in accState) if (accState[k]) n++;
    if (n === 0) el.textContent = tx("Nothing is on. This is the default state.", "Rien n’est activé. C’est l’état par défaut.");
    else el.textContent = tx(n + (n > 1 ? " permissions are on" : " permission is on") + ", each expiring in 12 months.",
      n + (n > 1 ? " permissions actives" : " permission active") + ", chacune expirant dans 12 mois.");
  }
  function updateConsentState() {
    var el = document.getElementById("consent-state");
    if (!el) return;
    var on = 0;
    Array.prototype.forEach.call(document.querySelectorAll(".switch[data-consent]"), function (s) {
      if (s.getAttribute("aria-checked") === "true") on++;
    });
    if (on === 0) {
      el.setAttribute("data-en", "Deny by default"); el.setAttribute("data-fr", "Refus par défaut");
      el.setAttribute("aria-pressed", "false");
    } else {
      el.setAttribute("data-en", on + (on > 1 ? " permissions active" : " permission active"));
      el.setAttribute("data-fr", on + (on > 1 ? " permissions actives" : " permission active"));
      el.setAttribute("aria-pressed", "true");
    }
    el.textContent = el.getAttribute("data-" + lang);
  }

  function wireScreen() {
    /* toast stubs */
    Array.prototype.forEach.call(document.querySelectorAll("[data-toast]"), function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        var label = (b.getAttribute("data-" + lang) || b.textContent).trim();
        toast(tx("Wireframe: “" + label + "” is not wired up in this demo.",
          "Maquette : « " + label + " » n’est pas branché dans cette démo."));
      });
    });

    /* 3D view pills */
    Array.prototype.forEach.call(document.querySelectorAll(".chip[data-view]"), function (p) {
      p.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll(".chip[data-view]"), function (o) {
          o.setAttribute("aria-pressed", String(o === p));
        });
        currentView = p.getAttribute("data-view");
        updateViewLabel();
      });
    });

    /* account toggles */
    Array.prototype.forEach.call(document.querySelectorAll(".switch[data-acc]"), function (s) {
      var id = s.getAttribute("data-acc");
      s.setAttribute("aria-checked", String(!!accState[id]));
      s.addEventListener("click", function () {
        if (s.disabled) return;
        var next = s.getAttribute("aria-checked") !== "true";
        accState[id] = next;
        s.setAttribute("aria-checked", String(next));
        if (id === "loc") {
          var seg = document.getElementById("loc-seg");
          if (seg) seg.hidden = !next;
          if (!next) { locMode = "open"; syncLocSeg(); }
        }
        updateAccSummary();
      });
    });
    var seg0 = document.getElementById("loc-seg");
    if (seg0) seg0.hidden = !accState.loc;
    syncLocSeg();
    Array.prototype.forEach.call(document.querySelectorAll("[data-locmode]"), function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-locmode");
        if (mode === "always") {
          var ok = window.confirm(tx(
            "Confirm “Always”. Background location is a bigger ask: the app can check your rounded area even when it is closed. It still stores an area, never a track history. Turn it on?",
            "Confirmer « Toujours ». La position en arrière-plan est une demande plus lourde : l’appli peut vérifier votre zone arrondie même fermée. Elle enregistre toujours une zone, jamais un historique. Activer ?"));
          if (!ok) return;
        }
        locMode = mode;
        syncLocSeg();
      });
    });
    function syncLocSeg() {
      Array.prototype.forEach.call(document.querySelectorAll("[data-locmode]"), function (b) {
        b.setAttribute("aria-pressed", String(b.getAttribute("data-locmode") === locMode));
      });
    }

    var rev = document.getElementById("revoke-all");
    if (rev) rev.addEventListener("click", function () {
      for (var k in accState) accState[k] = false;
      locMode = "open";
      Array.prototype.forEach.call(document.querySelectorAll(".switch[data-acc]"), function (s) {
        s.setAttribute("aria-checked", "false");
      });
      var seg = document.getElementById("loc-seg");
      if (seg) seg.hidden = true;
      syncLocSeg();
      updateAccSummary();
      toast(tx("Everything revoked. Back to the default: nothing is on.",
        "Tout est révoqué. Retour au défaut : rien n’est activé."));
    });

    /* consent toggles */
    Array.prototype.forEach.call(document.querySelectorAll(".switch[data-consent]"), function (s) {
      s.addEventListener("click", function () {
        if (s.disabled) return;
        s.setAttribute("aria-checked", s.getAttribute("aria-checked") === "true" ? "false" : "true");
        updateConsentState();
      });
    });
    var crev = document.getElementById("consent-revoke");
    if (crev) crev.addEventListener("click", function () {
      Array.prototype.forEach.call(document.querySelectorAll(".switch[data-consent]"), function (s) {
        s.setAttribute("aria-checked", "false");
      });
      updateConsentState();
      toast(tx("Register set back to DENY for every purpose.",
        "Registre remis à REFUS pour chaque finalité."));
    });

    /* audience segmented control */
    Array.prototype.forEach.call(document.querySelectorAll("[data-aud]"), function (b) {
      b.addEventListener("click", function () {
        Array.prototype.forEach.call(document.querySelectorAll("[data-aud]"), function (o) {
          o.setAttribute("aria-pressed", String(o === b));
        });
      });
    });
  }

  /* ---------------- live tickers ---------------- */
  setInterval(tickRel, 1000);
  var counts = [40, 40, 30, 50, 40, 50], ci = 0;
  setInterval(function () {
    ci = (ci + 1) % counts.length;
    var n = counts[ci];
    var a = document.getElementById("m-people");
    if (a) a.textContent = "~" + n;
    var b = document.getElementById("street-total");
    if (b) b.textContent = "~" + n;
    var f = document.getElementById("street-fill");
    if (f) f.style.width = Math.min(92, Math.round(n * 1.6)) + "%";
  }, 5000);

  window.addEventListener("hashchange", render);
  buildTabs();
  buildSheet();
  render();
  loadDigest();
})();
