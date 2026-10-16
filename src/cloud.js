/* Zeitplan – Cloud-Version: Anmeldung mit Microsoft, Daten direkt in Ihrem OneDrive (0_Planung › Zeitplan-App).
   Kein fremder Server: der Browser spricht direkt mit Microsoft. Dieselben Dateien nutzt auch die App auf dem PC. */
(function () {
  if (window.claude && window.claude.use) return;
  const CFG = window.ZP_CONFIG || {};
  const COLS = ["days", "notes", "reihen", "plan", "klassen", "vorlagen", "seiten"];
  const BASE = "0_Planung/Zeitplan-App";
  const GRAPH = "https://graph.microsoft.com/v1.0";
  const SCOPES = "openid profile offline_access User.Read Files.ReadWrite";
  const ACC = { privat: { tenant: "consumers", label: "privates Microsoft-Konto" } };
  const REDIRECT = location.origin + location.pathname;
  const mem = {}, subs = {}, timers = {}, dirty = {}, tags = {};
  COLS.forEach((c) => { mem[c] = {}; subs[c] = []; dirty[c] = {}; });
  let readyRes; const ready = new Promise((r) => (readyRes = r));
  const clone = (v) => (v == null ? v : JSON.parse(JSON.stringify(v)));
  const _fetch = window.fetch.bind(window);
  const ls = { get(k) { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };

  // ---------- Zwischenspeicher auf diesem Gerät (für die Arbeit ohne Internet) ----------
  // Pro Sammlung: Daten, Versionsstand von OneDrive und noch nicht hochgeladene Änderungen.
  let idbP = null;
  function idb() {
    if (!idbP) idbP = new Promise((res) => {
      try { const rq = indexedDB.open("zeitplan-offline", 1); rq.onupgradeneeded = () => rq.result.createObjectStore("cols"); rq.onsuccess = () => res(rq.result); rq.onerror = () => res(null); } catch (e) { res(null); }
    });
    return idbP;
  }
  async function cacheGet(c) {
    const d = await idb(); if (!d) return null;
    return new Promise((res) => { try { const rq = d.transaction("cols").objectStore("cols").get(c); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => res(null); } catch (e) { res(null); } });
  }
  const cacheT = {}; let cacheOk = false;
  function cachePut(c) {
    return idb().then((d) => d && new Promise((res) => {
      try { const tx = d.transaction("cols", "readwrite"); tx.objectStore("cols").put({ data: mem[c], tags: tags[c] || null, dirty: dirty[c], at: Date.now() }, c); tx.oncomplete = () => { cacheOk = true; res(true); }; tx.onerror = () => res(false); } catch (e) { res(false); }
    }));
  }
  function cacheSave(c) { clearTimeout(cacheT[c]); cacheT[c] = setTimeout(() => { cacheT[c] = 0; cachePut(c); }, 60); }
  const isOffline = (e) => !navigator.onLine || (e && (e.name === "TypeError" || e.offline));

  // ---------- Anmeldung (OAuth 2.0 mit PKCE, ohne Passwort in der App) ----------
  const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const rnd = (n) => b64url(crypto.getRandomValues(new Uint8Array(n)));
  async function login(acc, prompt) {
    const verifier = rnd(48), state = rnd(16);
    const challenge = b64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    sessionStorage.setItem("zp-pkce", JSON.stringify({ verifier, state, acc }));
    const tok = ls.get("zp-tok-" + acc) || {};
    const q = new URLSearchParams({ client_id: CFG.clientId, response_type: "code", redirect_uri: REDIRECT, scope: SCOPES, state, code_challenge: challenge, code_challenge_method: "S256", response_mode: "query" });
    if (prompt) q.set("prompt", prompt);
    if (tok.user) q.set("login_hint", tok.user);
    location.assign("https://login.microsoftonline.com/" + ACC[acc].tenant + "/oauth2/v2.0/authorize?" + q);
  }
  async function tokenRequest(acc, body) {
    const r = await _fetch("https://login.microsoftonline.com/" + ACC[acc].tenant + "/oauth2/v2.0/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: CFG.clientId, scope: SCOPES, ...body }) });
    const j = await r.json();
    if (!r.ok || !j.access_token) throw new Error(j.error_description || j.error || "Anmeldung fehlgeschlagen");
    const old = ls.get("zp-tok-" + acc) || {};
    const t = { access: j.access_token, exp: Date.now() + (j.expires_in - 120) * 1000, refresh: j.refresh_token || old.refresh, user: old.user };
    ls.set("zp-tok-" + acc, t); return t;
  }
  async function handleRedirect() {
    const q = new URLSearchParams(location.search);
    if (!q.get("code") && !q.get("error")) return;
    const p = JSON.parse(sessionStorage.getItem("zp-pkce") || "null"); sessionStorage.removeItem("zp-pkce");
    history.replaceState(null, "", REDIRECT);
    if (q.get("error")) throw new Error(q.get("error_description") || q.get("error"));
    if (!p || p.state !== q.get("state")) throw new Error("Anmeldung abgelaufen, bitte nochmals.");
    await tokenRequest(p.acc, { grant_type: "authorization_code", code: q.get("code"), redirect_uri: REDIRECT, code_verifier: p.verifier });
  }
  async function token(acc) {
    let t = ls.get("zp-tok-" + acc);
    if (t && t.access && t.exp > Date.now()) return t.access;
    if (t && t.refresh) {
      try { return (await tokenRequest(acc, { grant_type: "refresh_token", refresh_token: t.refresh })).access; }
      catch (e) { if (isOffline(e)) { const x = new Error("offline"); x.offline = true; throw x; } }
    }
    if (!navigator.onLine) { const x = new Error("offline"); x.offline = true; throw x; }
    await login(acc); await new Promise(() => {}); // Seite wird umgeleitet
  }
  async function g(path, opts, acc) {
    acc = acc || "privat"; opts = opts || {};
    for (let i = 0; i < 2; i++) {
      const r = await _fetch(path.startsWith("http") ? path : GRAPH + path, { ...opts, headers: { ...(opts.headers || {}), Authorization: "Bearer " + (await token(acc)) } });
      if (r.status === 401 && i === 0) { const t = ls.get("zp-tok-" + acc) || {}; t.exp = 0; ls.set("zp-tok-" + acc, t); continue; }
      return r;
    }
  }
  const enc = (p) => p.split("/").map(encodeURIComponent).join("/");
  const item = (p) => "/me/drive/root:/" + enc(p);
  async function download(meta) {
    const u = meta["@microsoft.graph.downloadUrl"];
    if (u) { try { const r = await _fetch(u); if (r.ok) return await r.blob(); } catch (e) {} }
    const r = await g("/me/drive/items/" + meta.id + "/content"); if (!r.ok) throw new Error("Download " + r.status); return await r.blob();
  }
  async function getMeta(p) { const r = await g(item(p)); if (r.status === 404) return null; if (!r.ok) throw new Error("OneDrive " + r.status); return await r.json(); }
  async function putFile(p, blob, ifMatch) {
    const h = { "Content-Type": "application/octet-stream" }; if (ifMatch) h["If-Match"] = ifMatch;
    if (blob.size > 200 * 1024 * 1024) throw new Error("Datei zu gross");
    return g(item(p) + ":/content", { method: "PUT", headers: h, body: blob });
  }

  // ---------- Startfenster ----------
  function gate(html, btn, onBtn) {
    let el = document.getElementById("zl-gate");
    if (!el) {
      const css = document.createElement("style");
      css.textContent = "#zl-gate{position:fixed;inset:0;z-index:99999;background:#f5f0e8;display:flex;align-items:center;justify-content:center;font:16px/1.5 system-ui,sans-serif}#zl-gate .b{background:#fffdf9;color:#2a241e;max-width:440px;margin:16px;padding:26px 26px;border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.12)}#zl-gate h2{margin:0 0 8px;font-size:1.3rem}#zl-gate p{margin:0 0 14px;color:#4a5866}#zl-gate button{font:inherit;font-weight:700;background:#a4502c;color:#fff;border:0;border-radius:10px;padding:11px 18px;cursor:pointer}#zl-gate small{display:block;margin-top:14px;color:#6b7785}#zl-badge{position:fixed;left:10px;bottom:10px;z-index:9999;font:12px system-ui,sans-serif;background:#f6e6db;color:#8a4324;border:1px solid #ead2c2;border-radius:999px;padding:3px 10px;opacity:.85}#zl-badge.off{background:#fff4e0;color:#8a5a00;border-color:#f0d29a;opacity:1}html.mob #zl-badge:not(.off),html.fit #zl-badge:not(.off){display:none}";
      document.head.appendChild(css);
      el = document.createElement("div"); el.id = "zl-gate"; (document.body || document.documentElement).appendChild(el);
    }
    el.innerHTML = '<div class="b"><h2>Semper</h2><p>' + html + "</p>" + (btn ? '<button type="button">' + btn + "</button>" : "") + "<small>Ihre Daten liegen in Ihrem OneDrive und gehen nur zwischen diesem Gerät und Microsoft hin und her.</small></div>";
    if (btn) el.querySelector("button").onclick = onBtn;
    return el;
  }

  // ---------- Daten laden ----------
  const DATEN = BASE + "/daten";
  async function listDaten() {
    const r = await g(item(DATEN) + ":/children?$top=200"); if (r.status === 404) return {};
    if (!r.ok) throw new Error("OneDrive " + r.status);
    const out = {}; ((await r.json()).value || []).forEach((m) => { if (m.file && /\.json$/.test(m.name)) out[m.name.slice(0, -5)] = m; }); return out;
  }
  async function loadCol(c, meta) {
    if (!meta) { mem[c] = {}; tags[c] = null; return; }
    mem[c] = JSON.parse((await (await download(meta)).text()) || "{}") || {}; tags[c] = { e: meta.eTag, c: meta.cTag };
  }
  async function start() {
    if (!CFG.clientId) { gate("Die App ist noch nicht fertig eingerichtet (es fehlt die Anwendungs-ID von Microsoft)."); return; }
    try { await handleRedirect(); } catch (e) { gate("Die Anmeldung hat nicht geklappt: " + esc(e.message || e), "Nochmals anmelden", () => login("privat", "select_account")); return; }
    const t = ls.get("zp-tok-privat");
    if (!t || !t.refresh) { gate("Bitte melden Sie sich mit Ihrem <b>privaten Microsoft-Konto</b> an (dasselbe wie für OneDrive).", "Mit Microsoft anmelden", () => login("privat", "select_account")); return; }
    if (!navigator.onLine && (await startOffline())) return;
    gate("Lädt Ihre Daten aus OneDrive …");
    try {
      if (!t.user) { const me = await (await g("/me")).json(); const tt = ls.get("zp-tok-privat"); tt.user = me.userPrincipalName || me.mail || ""; ls.set("zp-tok-privat", tt); }
      const metas = await listDaten();
      if (!metas.reihen && !metas.days) { gate("In Ihrem OneDrive fehlt der Ordner <b>0_Planung › Zeitplan-App › daten</b>. Ist das das richtige Konto?", "Anderes Konto wählen", () => { ls.del("zp-tok-privat"); login("privat", "select_account"); }); return; }
      await Promise.all(COLS.map((c) => loadCol(c, metas[c])));
      // Änderungen, die ohne Internet gemacht und noch nicht hochgeladen wurden, nachtragen
      for (const c of COLS) {
        const k = await cacheGet(c);
        if (k && k.dirty && Object.keys(k.dirty).length) {
          Object.entries(k.dirty).forEach(([id, op]) => { if (op === "del") delete mem[c][id]; else if (k.data && id in k.data) mem[c][id] = k.data[id]; });
          dirty[c] = { ...k.dirty }; persist(c);
        }
        cachePut(c);
      }
      await setupFolders();
      begin(false);
    } catch (e) {
      console.error(e);
      if (await startOffline()) return;
      gate("Die Daten konnten nicht geladen werden (" + esc(e.message || e) + "). Bitte Internetverbindung prüfen.", "Nochmals versuchen", () => location.reload());
    }
  }
  // Ohne Internet: mit dem letzten Stand auf diesem Gerät arbeiten
  async function startOffline() {
    const ks = await Promise.all(COLS.map(cacheGet));
    if (!ks.some((k) => k && k.data && Object.keys(k.data).length)) return false;
    COLS.forEach((c, i) => { const k = ks[i] || {}; mem[c] = k.data || {}; tags[c] = k.tags || null; dirty[c] = k.dirty || {}; });
    try { await setupFolders(); } catch (e) {}
    begin(true);
    return true;
  }
  let begun = false;
  function begin(offline) {
    if (begun) return; begun = true;
    const gt = document.getElementById("zl-gate"); if (gt) gt.remove();
    const b = document.createElement("div"); b.id = "zl-badge"; document.body.appendChild(b);
    readyRes();
    if (offline) goneOffline(); else setBadge(COLS.some((c) => Object.keys(dirty[c]).length) ? "Speichert …" : "OneDrive · gespeichert");
    setInterval(() => { if (document.visibilityState === "visible") { if (OFF) reconnect(); else { refresh(); dailyBackup(); } } }, 60000);
    setTimeout(() => { if (!OFF) dailyBackup(); }, 4000);
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") (OFF ? reconnect() : refresh()); });
    window.addEventListener("online", () => setTimeout(reconnect, 1500));
    window.addEventListener("offline", goneOffline);
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  }
  let OFF = false;
  function goneOffline() {
    OFF = true;
    const n = COLS.reduce((s, c) => s + Object.keys(dirty[c]).length, 0);
    setBadge("Offline · " + (n ? n + " Änderung" + (n > 1 ? "en" : "") + " auf diesem Gerät, wird später hochgeladen" : "Stand auf diesem Gerät"));
    const b = document.getElementById("zl-badge"); if (b) b.classList.add("off");
  }
  // Wieder online: offene Änderungen hochladen (mit Abgleich), dann neuesten Stand holen
  async function reconnect() {
    if (!navigator.onLine) return;
    try { await listDaten(); } catch (e) { return; }
    OFF = false; const b = document.getElementById("zl-badge"); if (b) b.classList.remove("off");
    const pend = COLS.filter((c) => Object.keys(dirty[c]).length);
    if (pend.length) pend.forEach((c) => persist(c)); else setBadge("OneDrive · gespeichert");
    refresh(); dailyBackup();
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch]));
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();

  // ---------- Tägliche Sicherung: 0_Planung › Zeitplan-App › Zeitplan Sicherung › JJJJ-MM-TT › *.json (90 Tage aufbewahrt) ----------
  const BACKUP = BASE + "/Zeitplan Sicherung";
  let backupDone = "";
  const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };
  async function dailyBackup() {
    const day = dayKey(); if (backupDone === day) return;
    backupDone = day;
    try {
      const dir = BACKUP + "/" + day;
      if (await getMeta(dir + "/reihen.json")) return; // heute schon gesichert (z. B. vom anderen Gerät)
      for (const c of COLS) {
        const r = await putFile(dir + "/" + c + ".json", new Blob([JSON.stringify(mem[c])], { type: "application/json" }));
        if (!r.ok) throw new Error("Sicherung " + c + ": " + r.status);
      }
      // ältere Sicherungen als 90 Tage entfernen
      const lr = await g(item(BACKUP) + ":/children?$top=500&$select=id,name,folder");
      if (lr.ok) {
        const limit = new Date(Date.now() - 90 * 864e5), lk = limit.getFullYear() + "-" + String(limit.getMonth() + 1).padStart(2, "0") + "-" + String(limit.getDate()).padStart(2, "0");
        for (const x of (await lr.json()).value || []) if (x.folder && /^\d{4}-\d{2}-\d{2}$/.test(x.name) && x.name < lk) await g("/me/drive/items/" + x.id, { method: "DELETE" });
      }
    } catch (e) { console.warn("Sicherung", e); backupDone = ""; }
  }

  // Für «Speicherpunkte»: die täglichen Sicherungen auflisten und laden
  window.ZBACKUP = {
    async list() {
      const r = await g(item(BACKUP) + ":/children?$top=500&$select=name,folder"); if (!r.ok) return [];
      return ((await r.json()).value || []).filter((x) => x.folder && /^\d{4}-\d{2}-\d{2}$/.test(x.name)).map((x) => x.name).sort().reverse();
    },
    async load(day) {
      const out = { app: "zeitplan", version: 1, at: day + "T12:00:00", collections: {} };
      for (const c of COLS) { const m = await getMeta(BACKUP + "/" + day + "/" + c + ".json"); out.collections[c] = m ? JSON.parse((await (await download(m)).text()) || "{}") || {} : {}; }
      if (!Object.keys(out.collections.reihen || {}).length && !Object.keys(out.collections.days || {}).length) throw new Error("Sicherung leer");
      const m = await getMeta(BACKUP + "/" + day + "/reihen.json"); if (m && m.lastModifiedDateTime) out.at = m.lastModifiedDateTime;
      return out;
    },
    offline: () => OFF,
  };

  // Änderungen von anderen Geräten (PC, Handy) übernehmen
  let refreshing = false;
  async function refresh() {
    if (refreshing) return; refreshing = true;
    try {
      const metas = await listDaten();
      for (const c of COLS) {
        const m = metas[c]; if (!m || (tags[c] && tags[c].c === m.cTag)) continue;
        if (timers[c] || Object.keys(dirty[c]).length) continue; // eigene Änderung wird gerade gespeichert – Abgleich passiert dort
        await loadCol(c, m); cachePut(c); notify(c);
      }
    } catch (e) { console.warn(e); } finally { refreshing = false; }
  }

  // ---------- Speichern (mit Abgleich, falls ein anderes Gerät gleichzeitig gespeichert hat) ----------
  let warned = false;
  // timers[c]: Speichern geplant oder unterwegs · ver[c]: zählt Änderungen, damit nichts verloren geht, was während des Hochladens dazukam
  const ver = {}, busy = {};
  COLS.forEach((c) => { ver[c] = 0; });
  function persist(c) {
    if (OFF) { goneOffline(); return; }
    if (busy[c]) { busy[c].again = true; return; }
    clearTimeout(timers[c]);
    timers[c] = setTimeout(() => upload(c), 400);
    setBadge("Speichert …");
  }
  async function upload(c) {
    const run = (busy[c] = { again: false }), v0 = ver[c] || 0;
    try {
      let r = await putFile(DATEN + "/" + c + ".json", new Blob([JSON.stringify(mem[c])], { type: "application/json" }), tags[c] && tags[c].e);
      if (r.status === 412) {
        const m = await getMeta(DATEN + "/" + c + ".json");
        const remote = JSON.parse((await (await download(m)).text()) || "{}") || {};
        Object.entries(dirty[c]).forEach(([id, op]) => { if (op === "del") delete remote[id]; else if (id in mem[c]) remote[id] = mem[c][id]; });
        mem[c] = remote; notify(c);
        r = await putFile(DATEN + "/" + c + ".json", new Blob([JSON.stringify(mem[c])], { type: "application/json" }), m.eTag);
      }
      if (!r.ok) throw new Error("OneDrive " + r.status);
      const j = await r.json(); tags[c] = { e: j.eTag, c: j.cTag };
      if ((ver[c] || 0) === v0) dirty[c] = {}; // sonst: neuere Änderungen bleiben offen und werden gleich nochmals hochgeladen
      busy[c] = null; timers[c] = 0; cachePut(c);
      if (run.again || Object.keys(dirty[c]).length) persist(c);
      else if (!COLS.some((x) => timers[x])) setBadge("OneDrive · gespeichert");
    } catch (e) {
      console.error(e); busy[c] = null; timers[c] = 0;
      if (isOffline(e) && cacheOk) { goneOffline(); return; } // bleibt auf diesem Gerät gespeichert; Upload, sobald wieder online
      setBadge("Nicht gespeichert – versucht es erneut …");
      if (!warned && !cacheOk) { warned = true; setTimeout(() => { if (timers[c]) alert("Speichern in OneDrive klappt gerade nicht (keine Verbindung?). Die App versucht es weiter – bitte das Fenster offen lassen."); }, 20000); }
      timers[c] = setTimeout(() => persist(c), 5000);
    }
  }
  function setBadge(t) { const b = document.getElementById("zl-badge"); if (b) b.textContent = t; }
  window.addEventListener("beforeunload", (e) => { if (!cacheOk && Object.values(timers).some(Boolean)) { e.preventDefault(); e.returnValue = ""; } });

  // ---------- Schnittstelle wie bei claude.ai ----------
  const colSnap = (c) => ({ docs: Object.keys(mem[c]).map((id) => ({ id, exists: true, data: () => clone(mem[c][id]) })) });
  const docSnap = (c, id) => ({ id, exists: Object.prototype.hasOwnProperty.call(mem[c], id), data: () => clone(mem[c][id]) });
  function notify(c) { setTimeout(() => subs[c].forEach((s) => { try { s.cb(s.id == null ? colSnap(c) : docSnap(c, s.id)); } catch (e) { console.error(e); } }), 0); }
  const db = {
    collection(c) {
      if (!mem[c]) { mem[c] = {}; subs[c] = []; dirty[c] = {}; }
      return {
        onSnapshot(cb) { const s = { cb }; subs[c].push(s); setTimeout(() => cb(colSnap(c)), 0); return () => { subs[c] = subs[c].filter((x) => x !== s); }; },
        get: async () => colSnap(c),
        limit() { return { get: async () => colSnap(c) }; },
        doc(id) {
          return {
            async set(d) { mem[c][id] = clone(d); dirty[c][id] = "set"; ver[c] = (ver[c] || 0) + 1; cacheSave(c); persist(c); notify(c); },
            async update(d) { mem[c][id] = { ...(mem[c][id] || {}), ...clone(d) }; dirty[c][id] = "set"; ver[c] = (ver[c] || 0) + 1; cacheSave(c); persist(c); notify(c); },
            async delete() { delete mem[c][id]; dirty[c][id] = "del"; ver[c] = (ver[c] || 0) + 1; cacheSave(c); persist(c); notify(c); },
            get: async () => docSnap(c, id),
            onSnapshot(cb) { const s = { cb, id }; subs[c].push(s); setTimeout(() => cb(docSnap(c, id)), 0); return () => { subs[c] = subs[c].filter((x) => x !== s); }; },
          };
        },
      };
    },
  };
  const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
  const DOKS = BASE + "/dokumente";
  const assets = {
    async upload(blob, opts) {
      const id = rid(); const r = await putFile(DOKS + "/" + id, blob); if (!r.ok) throw new Error("Hochladen in OneDrive: " + r.status);
      return { id, url: "/_blob/" + id, sizeBytes: blob.size, contentType: (opts && opts.type) || blob.type || "application/octet-stream" };
    },
    async delete(id) { try { const m = await getMeta(DOKS + "/" + id); if (m) await g("/me/drive/items/" + m.id, { method: "DELETE" }); } catch (e) {} },
  };
  const downloads = {
    async save(o) {
      const blob = o.data instanceof Blob ? o.data : new Blob([o.data]);
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = o.filename || "Datei";
      document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      return true;
    },
  };
  window.claude = { use: async (name) => { await ready; if (name === "db") return db; if (name === "assets") return assets; if (name === "downloads") return downloads; throw new Error("nicht verfügbar"); } };

  // ---------- Dokumente lesen (statt /_blob/ bei claude.ai) ----------
  const blobRe = /\/_blob\/([0-9a-f]{8,64})(?:$|[?#])/;
  const docCache = {};
  async function readDoc(id) {
    await ready;
    if (!docCache[id]) docCache[id] = (async () => { const m = await getMeta(DOKS + "/" + id); if (!m) throw new Error("404"); return download(m); })();
    try { return await docCache[id]; } catch (e) { delete docCache[id]; throw e; }
  }
  window.fetch = async (u, o) => {
    const s = typeof u === "string" ? u : (u && u.url) || "";
    const m = blobRe.exec(s);
    if (m) { try { return new Response(await readDoc(m[1]), { status: 200 }); } catch (e) { return new Response("", { status: 404 }); } }
    return _fetch(u, o);
  };
  const urlCache = {};
  async function fixImg(img) {
    const m = blobRe.exec(img.getAttribute("src") || ""); if (!m || img.dataset.zl === m[1]) return;
    img.dataset.zl = m[1];
    try { urlCache[m[1]] = urlCache[m[1]] || URL.createObjectURL(await readDoc(m[1])); img.srcset = urlCache[m[1]]; } catch (e) {}
  }
  new MutationObserver((ms) => ms.forEach((mu) => {
    if (mu.type === "attributes") { if (mu.target.tagName === "IMG") fixImg(mu.target); return; }
    mu.addedNodes.forEach((n) => { if (n.nodeType !== 1) return; if (n.tagName === "IMG") fixImg(n); else n.querySelectorAll && n.querySelectorAll("img[src*='/_blob/']").forEach(fixImg); });
  })).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });

  // ---------- Ordner und Word-Dateien in OneDrive ----------
  // Pfade werden wie in der PC-App als Windows-Pfad gespeichert (…\0_Planung\Reihen\…); hier in OneDrive-Pfade übersetzt.
  let ROOT = "0_Planung";
  const toDrive = (p) => { const i = p.indexOf("0_Planung"); return (i >= 0 ? p.slice(i) : p).split("\\").join("/").replace(/\/+$/, ""); };
  function guessRoot() {
    for (const r of Object.values(mem.reihen || {})) {
      const s = (r && (r.folder || "")) || ""; const i = s.indexOf("\\0_Planung"); if (i > 0) return s.slice(0, i + 10);
      for (const l of (r && r.lessons) || []) for (const f of (l && l.files) || []) { const p = (f && f.path) || ""; const j = p.indexOf("\\0_Planung"); if (j > 0) return p.slice(0, j + 10); }
    }
    for (const v of Object.values(mem.vorlagen || {})) { const p = (v && v.path) || ""; const j = p.indexOf("\\0_Planung"); if (j > 0) return p.slice(0, j + 10); }
    return "C:\\OneDrive\\0_Planung";
  }
  async function mkdirDrive(p) {
    const m = await getMeta(p); if (m) return m;
    const i = p.lastIndexOf("/"), parent = p.slice(0, i), name = p.slice(i + 1);
    if (parent && parent.indexOf("/") >= 0) await mkdirDrive(parent);
    const r = await g(item(parent) + ":/children", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, folder: {}, "@microsoft.graph.conflictBehavior": "fail" }) });
    if (r.ok) return await r.json();
    const again = await getMeta(p); if (again) return again;
    throw new Error("Ordner anlegen: " + r.status);
  }
  async function children(p) { const r = await g(item(p) + ":/children?$top=500&$select=name,folder"); if (!r.ok) return []; return ((await r.json()).value || []).filter((x) => x.folder).map((x) => x.name); }
  async function setupFolders() {
    ROOT = guessRoot();
    const dirs = [];
    try {
      const top = await children("0_Planung/Reihen");
      const subs2 = await Promise.all(top.map((t) => children("0_Planung/Reihen/" + t)));
      top.forEach((t, i) => { dirs.push(ROOT + "\\Reihen\\" + t); subs2[i].forEach((s) => dirs.push(ROOT + "\\Reihen\\" + t + "\\" + s)); });
    } catch (e) {}
    const openUrl = async (p, w) => {
      const m = await getMeta(toDrive(p)); if (!m) { if (w) w.close(); throw new Error("nicht gefunden"); }
      const url = m.webUrl;
      if (w) w.location.href = url; else window.open(url, "_blank");
    };
    // Am PC: kleiner Helfer (Zeitplan-Dienst) öffnet Explorer bzw. Word mit der echten Datei; sonst OneDrive im Browser
    const HELPER = "http://localhost:8123";
    const isPC = /Windows/.test(navigator.userAgent) && !/Android|Mobile/.test(navigator.userAgent);
    let helperOk = null, helperAt = 0;
    async function helperAlive() {
      if (!isPC) return false;
      if (helperOk !== null && Date.now() - helperAt < 60000) return helperOk;
      try { const c = new AbortController(); const t = setTimeout(() => c.abort(), 900); const r = await _fetch(HELPER + "/api/version", { signal: c.signal, cache: "no-store" }); clearTimeout(t); helperOk = r.ok; } catch (e) { helperOk = false; }
      helperAt = Date.now(); return helperOk;
    }
    async function viaHelper(p) {
      if (!(await helperAlive())) return false;
      try {
        const meta = btoa(unescape(encodeURIComponent(JSON.stringify({ path: p }))));
        const r = await _fetch(HELPER + "/api/open", { method: "POST", headers: { "X-Meta": meta } });
        return r.ok;
      } catch (e) { helperOk = null; return false; }
    }
    window.ZLOCAL = {
      cloud: true, root: ROOT, dirs,
      async open(path) { if (await viaHelper(path)) return; await openUrl(path, window.open("", "_blank")); },
      async list(path) { return (await children(toDrive(path))).sort((x, y) => x.localeCompare(y, "de")); },
      async read(path) { const m = await getMeta(toDrive(path)); if (!m) throw new Error("nicht gefunden"); return download(m); },
      async place(folder, name, blob, open) {
        const p = folder.replace(/\\+$/, "") + "\\" + name;
        let m = await getMeta(toDrive(p)); const existed = !!m;
        if (!m) { const r = await putFile(toDrive(p), blob); if (!r.ok) throw new Error("Ablegen in OneDrive: " + r.status); }
        if (open && !(await viaHelper(p))) await openUrl(p, window.open("", "_blank"));
        return { ok: true, path: p, existed };
      },
      async saveVersion() { throw new Error("nicht verfügbar"); },
      async exists(path) { return !!(await getMeta(toDrive(path))); },
      // Datei überschreiben (für «Als Original übernehmen»; die alte Fassung wird vorher von der App gesichert)
      async write(path, blob) { const r = await putFile(toDrive(path), blob); if (!r.ok) throw new Error("Speichern in OneDrive: " + r.status); return path; },
      // PowerPoint/Word von Microsoft in ein PDF umwandeln lassen (für einzelne Folien/Seiten in der Lektionsseite).
      // src: { path } (Datei im Reihen-Ordner) oder { bytes, name } (Kopie der App, wird kurz in «temp» abgelegt und wieder gelöscht)
      async toPdf(src) {
        let id = null, tmp = false;
        if (src.path) { const m = await getMeta(toDrive(src.path)); if (m) id = m.id; }
        if (!id) {
          if (!src.bytes) throw new Error("Datei nicht gefunden");
          const r = await putFile(BASE + "/temp/" + Date.now().toString(36) + "-" + String(src.name || "datei").replace(/[^\w.\-]+/g, "_"), new Blob([src.bytes]));
          if (!r.ok) throw new Error("Hochladen: " + r.status); id = (await r.json()).id; tmp = true;
        }
        try { const r = await g("/me/drive/items/" + id + "/content?format=pdf"); if (!r.ok) throw new Error("Umwandeln: " + r.status); return await r.blob(); }
        finally { if (tmp) g("/me/drive/items/" + id, { method: "DELETE" }).catch(() => {}); }
      },
      // Ordner anlegen (auch mehrere Ebenen); vorhandene bleiben unverändert
      async mkdir(path) { return mkdirDrive(toDrive(path)); },
      // Datei oder ganzen Ordner in OneDrive kopieren (läuft bei Microsoft, nichts wird heruntergeladen).
      // src: Windows-Pfad oder { doc: Kennnummer } für ein Dokument der App. Gibt den neuen Pfad zurück.
      async copy(src, folder, name) {
        const sm = typeof src === "string" ? await getMeta(toDrive(src)) : await getMeta(DOKS + "/" + src.doc);
        if (!sm) throw new Error("Quelle nicht gefunden");
        const dm = await mkdirDrive(toDrive(folder));
        const r = await g("/me/drive/items/" + sm.id + "/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ parentReference: { driveId: (dm.parentReference || {}).driveId, id: dm.id }, name }) });
        if (!r.ok && r.status !== 202) throw new Error("Kopieren: " + r.status);
        return folder.replace(/\\+$/, "") + "\\" + name;
      },
    };
  }
})();
