// Records the ~60 s captioned demo video of Footnote Desk against the local dev server.
//
//   node scripts/record-demo.mjs prep     (once: test owner account, 2 documents, unanswered questions)
//   node scripts/record-demo.mjs record   (writes JPEG frames + frames.txt to OUT_DIR)
//   swift scripts/frames-to-mp4.swift OUT_DIR demo.mp4
//
// Needs Google Chrome and the dev server on BASE (default http://localhost:3002).
// The test owner's email and password are kept in .env.local (DEMO_VIDEO_EMAIL / DEMO_VIDEO_PASSWORD).
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3002";
const OUT = process.env.OUT_DIR ?? "demo-frames";
const PROFILE = process.env.PROFILE_DIR ?? path.join(OUT, "..", "demo-chrome-profile");
const ROOT = path.resolve(import.meta.dirname, "..");
const mode = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Chrome over the DevTools protocol ----
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=9334",
  `--user-data-dir=${PROFILE}`, "--window-size=1440,900", "about:blank",
], { stdio: "ignore" });
process.on("exit", () => chrome.kill());
let tabs;
for (let i = 0; i < 40 && !tabs; i++) {
  await sleep(250);
  tabs = await fetch("http://127.0.0.1:9334/json").then((r) => r.json()).catch(() => null);
}
const ws = new WebSocket(tabs.find((t) => t.type === "page").webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let nextId = 0;
const pending = new Map();
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) pending.get(m.id)(m);
};
async function send(method, params = {}) {
  const m = await new Promise((r) => { pending.set(++nextId, r); ws.send(JSON.stringify({ id: nextId, method, params })); });
  if (m.error) throw new Error(`${method}: ${m.error.message}`);
  return m.result;
}
async function js(expr) {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? expr);
  return r.result.value;
}
async function go(url) {
  await send("Page.navigate", { url: BASE + url });
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    if ((await js("document.readyState").catch(() => "")) === "complete") break;
  }
  await sleep(600);
}
async function waitFor(expr, ms = 60000) {
  for (let t = 0; t < ms; t += 250) {
    if (await js(expr).catch(() => false)) return;
    await sleep(250);
  }
  throw new Error(`Timed out waiting for ${expr}`);
}
// Puts a local file into the page's file input and fires the change event, like choosing it
async function setFile(selector, file) {
  const b64 = readFileSync(file).toString("base64");
  await js(`(() => {
    const bytes = Uint8Array.from(atob(${JSON.stringify(b64)}), (c) => c.charCodeAt(0));
    const dt = new DataTransfer();
    dt.items.add(new File([bytes], ${JSON.stringify(path.basename(file))}, { type: "application/pdf" }));
    const input = document.querySelector(${JSON.stringify(selector)});
    input.files = dt.files;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  })()`);
}
const UPLOAD_DONE = `/is ready|Couldn/.test(document.querySelector("#upload")?.parentElement.parentElement.querySelector("[role=status]")?.textContent ?? "")`;

await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });

function readEnv() {
  const env = Object.fromEntries(
    readFileSync(path.join(ROOT, ".env.local"), "utf8").split("\n")
      .filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
  );
  return env;
}

// ---- prep: a fresh owner with two documents and a few unanswered questions ----
if (mode === "prep") {
  // Reuse the test owner from an earlier run, or create one
  let { DEMO_VIDEO_EMAIL: email, DEMO_VIDEO_PASSWORD: password } = readEnv();
  const isNew = !email;
  if (isNew) {
    email = `video-owner-${randomBytes(3).toString("hex")}@example.com`;
    password = randomBytes(12).toString("base64url");
    appendFileSync(path.join(ROOT, ".env.local"), `\n# Test owner for scripts/record-demo.mjs (local only)\nDEMO_VIDEO_EMAIL=${email}\nDEMO_VIDEO_PASSWORD=${password}\n`);
  }
  await go(isNew ? "/signup" : "/signin");
  if ((await js("location.pathname")) !== "/dashboard") {
    await js(`(() => {
      const f = document.querySelector("form");
      if (f.company) f.company.value = "Aerin Home";
      f.email.value = ${JSON.stringify(email)}; f.password.value = ${JSON.stringify(password)};
      f.requestSubmit();
    })()`);
    await waitFor(`location.pathname === "/dashboard"`);
  }
  await sleep(1500);

  for (const file of ["aerin-p3-user-manual.pdf", "warranty-and-returns.pdf"]) {
    if (await js(`document.querySelector("main").innerText.includes(${JSON.stringify(file)})`)) continue;
    await setFile("input[type=file]", path.join(ROOT, "demo-docs", file));
    await waitFor(UPLOAD_DONE, 120000);
    console.log(file, await js(`document.querySelector("#upload").parentElement.parentElement.querySelector("[role=status]").textContent`));
    await go("/dashboard");
  }

  // Keep exactly one copy of each prepared document; the recording uploads the third itself
  for (;;) {
    const extra = await js(`(() => {
      const seen = new Set();
      for (const b of document.querySelectorAll('button[aria-label^="Delete "]')) {
        const name = b.getAttribute("aria-label").slice(7);
        const keep = ["aerin-p3-user-manual.pdf", "warranty-and-returns.pdf"].includes(name) && !seen.has(name);
        seen.add(name);
        if (!keep) { b.click(); return name; }
      }
      return null;
    })()`);
    if (!extra) break;
    console.log("Removed extra", extra);
    await sleep(2500);
    await go("/dashboard");
  }

  const slug = await js(`new URL(document.querySelector('a[href*="/c/"]').href).pathname.slice(3)`);
  // A realistic mix: mostly answered, a few gaps for the "unanswered" list
  const text = await js(`document.querySelector("main").innerText`);
  const answeredPct = Number(text.match(/(\d+)% answered/)?.[1] ?? 0);
  const questions = [
    ...(text.includes("No questions y") ? ["Do you ship to Canada?", "Does the P3 work with Alexa or Google Home?", "Do you ship to Canada?", "Is there a student discount?"] : []),
    ...(answeredPct < 50 ? ["How often should I replace the filter?", "Can I wash the HEPA filter?", "What does the warranty cover?", "How do I return the purifier?",
      "How loud is it on the lowest setting?", "What does the filter light mean?", "How long is the warranty?", "Can I get a refund after 30 days?", "How do I reset the filter light?", "Is it safe to run all night?"] : []),
  ];
  for (const q of questions) {
    const r = await js(`fetch("/api/ask", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspace: ${JSON.stringify(slug)}, question: ${JSON.stringify(q)}, history: [] }) }).then((r) => r.json())`);
    console.log(q, "->", r.answer?.kind ?? r.error);
    await sleep(1500);
  }
  console.log("Prepared workspace", slug);
}

// ---- record ----
if (mode === "record") {
  mkdirSync(OUT, { recursive: true });

  // Caption bar, cursor and end card, re-created on every page
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__demo = {
      el(id, css) {
        let e = document.getElementById(id);
        if (!e) { e = document.createElement("div"); e.id = id; e.style.cssText = css; document.body.appendChild(e); }
        return e;
      },
      caption(text) {
        const c = this.el("demo-caption", "position:fixed;left:50%;bottom:28px;transform:translateX(-50%);z-index:99999;max-width:900px;padding:14px 26px;border-radius:10px;background:rgba(30,26,36,.94);color:#fff;font:600 22px/1.35 var(--font-ui),sans-serif;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.25);transition:opacity .35s;opacity:0");
        c.style.opacity = 0;
        setTimeout(() => { c.textContent = text; c.style.opacity = text ? 1 : 0; }, text ? 200 : 0);
      },
      cursor() {
        const c = this.el("demo-cursor", "position:fixed;left:720px;top:450px;z-index:100000;width:22px;height:22px;pointer-events:none;transition:left .7s cubic-bezier(.2,.8,.2,1),top .7s cubic-bezier(.2,.8,.2,1)");
        if (!c.innerHTML) c.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#1e1a24" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
        return c;
      },
      moveTo(sel) {
        const t = document.querySelector(sel); const r = t.getBoundingClientRect();
        const c = this.cursor(); c.style.left = (r.left + Math.min(r.width / 2, 60)) + "px"; c.style.top = (r.top + r.height / 2) + "px";
      },
      endCard() {
        this.el("demo-end", "position:fixed;inset:0;z-index:100001;display:grid;place-content:center;gap:18px;text-align:center;background:#5a2a82;color:#fff;font-family:var(--font-ui),sans-serif").innerHTML =
          '<div style="font:800 64px/1 var(--font-ui),sans-serif;letter-spacing:-.03em">Footnote Desk</div>' +
          '<div style="font:400 28px/1.4 var(--font-reading),serif">A support bot that shows its sources</div>' +
          '<div style="margin-top:12px;font:600 26px/1 var(--font-ui),sans-serif;color:#fbe55a">footnote-desk.vercel.app</div>';
      },
    };
    document.addEventListener("DOMContentLoaded", () => {
      const s = document.createElement("style");
      s.textContent = "nextjs-portal{display:none!important}";
      document.head.appendChild(s);
    });
  ` });

  // Frame grabber: runs alongside the scenes; paused during slow waits (jump cut)
  let rec = false, stop = false, n = 0, t0 = 0, paused = 0, pauseStart = 0;
  const list = [];
  const grab = (async () => {
    while (!stop) {
      if (!rec) { await sleep(40); continue; }
      const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 88 });
      const file = `f${String(n++).padStart(5, "0")}.jpg`;
      writeFileSync(path.join(OUT, file), Buffer.from(data, "base64"));
      list.push(`${file} ${((Date.now() - t0 - paused) / 1000).toFixed(3)}`);
    }
  })();
  const start = () => { if (!t0) t0 = Date.now(); else paused += Date.now() - pauseStart; rec = true; };
  const pause = () => { rec = false; pauseStart = Date.now(); };
  const caption = (t) => js(`__demo.caption(${JSON.stringify(t)})`);
  const click = async (sel) => {
    await js(`__demo.moveTo(${JSON.stringify(sel)})`);
    await sleep(900);
    await js(`document.querySelector(${JSON.stringify(sel)}).click()`);
  };

  // 1. Home
  await go("/");
  await js("__demo.cursor()");
  start();
  await caption("Footnote Desk answers support questions only from your own documents.");
  await sleep(7000);

  // 2. Citations
  await caption("Every answer cites the file and page, and highlights the exact passage.");
  await sleep(1200);
  await click(`ul[aria-label="Sources"] li:nth-child(2) button`);
  await sleep(3500);
  await click(`ul[aria-label="Sources"] li:nth-child(1) button`);
  await sleep(3500);

  // 3. Not in the documents
  await caption("If the documents don't cover a question, it says so instead of guessing.");
  await js(`window.scrollBy({ top: 280, behavior: "smooth" })`);
  await sleep(900);
  await click("#question");
  await js(`document.querySelector("#question").focus()`);
  await sleep(400);
  for (const ch of "Do you ship to Canada?") {
    await send("Input.insertText", { text: ch });
    await sleep(70);
  }
  await sleep(500);
  await click(`button[type=submit]`);
  pause();
  await waitFor(`document.body.innerText.includes("Not in Aerin Home") || /busy|Couldn/.test(document.body.innerText)`);
  await js(`[...document.querySelectorAll("li, article, div")].reverse().find((e) => e.textContent.startsWith("Not in Aerin Home"))?.scrollIntoView({ block: "center" })`);
  await sleep(300);
  start();
  await sleep(5000);

  // 4. Dashboard
  pause();
  await go("/dashboard");
  await js("__demo.cursor()");
  // Show the address customers would really get, not the local dev one
  await js(`document.querySelectorAll("main *").forEach((e) => { for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.includes(location.host)) n.textContent = n.textContent.replace(location.host, "footnote-desk.vercel.app"); })`);
  start();
  await caption("Owners see the questions their documents couldn't answer, so they know what to add.");
  await sleep(6000);
  await js(`window.scrollTo({ top: document.querySelector("#upload").getBoundingClientRect().top + scrollY - 520, behavior: "smooth" })`);
  await sleep(3000);

  // 5. Upload
  await caption("Upload a PDF and customers can ask about it in seconds.");
  await js(`__demo.moveTo("label[for=upload]")`);
  await sleep(1200);
  await setFile("input[type=file]", path.join(ROOT, "demo-docs", "filter-subscription-faq.pdf"));
  await sleep(1500);
  pause();
  await waitFor(UPLOAD_DONE, 120000);
  await waitFor(`!!document.querySelector('button[aria-label="Delete filter-subscription-faq.pdf"]')`);
  await js(`window.scrollBy(0, 230)`);
  await sleep(500);
  start();
  await sleep(4500);

  // 6. Pricing and end card
  pause();
  await go("/pricing");
  start();
  await caption("Free and Pro plans. Built with Next.js, Supabase and Gemini.");
  await sleep(5000);
  await caption("");
  await js("__demo.endCard()");
  await sleep(4000);

  stop = true;
  await grab;
  writeFileSync(path.join(OUT, "frames.txt"), list.join("\n") + "\n");
  console.log(`${n} frames, ${list.at(-1)?.split(" ")[1]} s`);
}

ws.close();
chrome.kill();
