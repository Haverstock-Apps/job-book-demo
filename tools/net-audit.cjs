// A STANDALONE COPY of Haverstock-Apps/preflight tools/net-audit.cjs, where it is maintained. This repo's CI cannot read
// preflight without a cross-repo token, so it carries its own copy. Change it in preflight first, then copy it here.
//
// Does any test reach a real host? Load this into every Node process the suite starts, and it logs each outbound TCP
// connection, tagged with the test that caused it, and REFUSES anything off loopback, so nothing reaches a live host
// while you look.
//
// Usage:
//   NET_AUDIT_LOG=/tmp/net.jsonl NODE_OPTIONS="--require $PWD/tools/net-audit.cjs" npm test
//   node tools/net-audit.cjs /tmp/net.jsonl        # the summary: every off-loopback connection, by test
//
// Why a socket hook and not a fetch hook: fetch, http, https and npm all end in net.Socket#connect, so one hook sees
// them all. It rides NODE_OPTIONS, so it reaches every Node child that inherits the environment: the door, a hook, a
// detached `preflight sync`, npm itself. It does NOT see programs that are not Node (git, curl, gh). Check those by
// reading the tests.
//
// First run (2026-09-24, 104 tests, 1710 connections): test-documents-reach-a-coding-agent.mjs sent the developer's
// real key to the live workspace through a detached `preflight sync` (fixed: the test got its own HOME), and
// test-install-download.mjs let npm ask registry.npmjs.org for its own latest version (fixed: update notifier off).
//
// A refused connection fails the way an unreachable host does (ECONNREFUSED), so a test that NEEDS the network goes
// red under this, and that is a finding too. Measure a known negative first: a test you know calls out must show up
// in the log, or the log is not being written.
"use strict";
const net = require("net"), fs = require("fs"), path = require("path");

// "localhost." (trailing dot) is loopback too; test-rules-feed.mjs uses it on purpose.
const LOCAL = /^(127\.|::1$|::ffff:127\.|localhost\.?$|0\.0\.0\.0$|::$)/i;

if (require.main === module) {
  const file = process.argv[2];
  if (!file) { console.error("usage: node tools/net-audit.cjs <log.jsonl>"); process.exit(2); }
  // A missing or empty log reads as clean, and it is not: nothing was measured.
  if (!fs.existsSync(file)) { console.error(`net-audit: ${file} does not exist, so nothing was measured`); process.exit(2); }
  const all = fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  // Every process the audit loads into writes one `loaded` row, so a suite that opens no connection at all still
  // proves the audit ran. Without them, "loaded and nothing connected" and "never loaded" looked the same (an empty
  // log), and a suite with no network use could never pass (job-book-demo, 2026-09-24).
  const loaded = all.filter((r) => r.loaded);
  const rows = all.filter((r) => !r.loaded);
  if (!all.length) { console.error(`net-audit: ${file} is empty, so nothing was measured`); process.exit(2); }
  const off = rows.filter((r) => !r.local);
  console.log(`${rows.length} connections from ${new Set(rows.map((r) => r.test)).size} tests; ${off.length} off loopback` +
    ` (audit loaded in ${loaded.length} processes)`);
  const byKey = {};
  for (const r of off) { const k = `${r.test} | ${r.proc} ${r.argv} -> ${r.host}:${r.port}`; byKey[k] = (byKey[k] || 0) + 1; }
  for (const [k, n] of Object.entries(byKey)) console.log(`  ${n}  ${k}`);
  process.exit(off.length ? 1 : 0);
}

const LOG = process.env.NET_AUDIT_LOG;
const me = path.basename(process.argv[1] || "?");
// The first test-shaped script in the chain names the test; its children inherit the name through the environment.
if (/^(test-.*|.*selftest.*)\.(m?js|cjs)$/.test(me) || /(^|\/)test\//.test(process.argv[1] || "")) {
  if (!(process.env.NET_AUDIT_TEST || "").startsWith("test")) process.env.NET_AUDIT_TEST = me;
}

if (LOG) {
  try { fs.appendFileSync(LOG, JSON.stringify({ loaded: true, test: process.env.NET_AUDIT_TEST || "?", proc: me }) + "\n"); }
  catch { /* the audit must never be why a test fails */ }
}

const connect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let o = Array.isArray(args[0]) ? args[0][0] : args[0];
  let host, port;
  if (o && typeof o === "object") {
    if (o.path) return connect.apply(this, args); // a unix socket
    host = o.host || "localhost"; port = o.port;
  } else if (typeof o === "number" || /^\d+$/.test(String(o))) {
    port = o; host = typeof args[1] === "string" ? args[1] : "localhost";
  } else return connect.apply(this, args); // a unix socket path
  const local = LOCAL.test(String(host));
  if (LOG) {
    try {
      fs.appendFileSync(LOG, JSON.stringify({ test: process.env.NET_AUDIT_TEST || "?", proc: me,
        argv: process.argv.slice(2, 4).join(" ").slice(0, 80), host, port, local }) + "\n");
    } catch { /* the audit must never be why a test fails */ }
  }
  if (local) return connect.apply(this, args);
  const sock = this;
  process.nextTick(() => sock.destroy(Object.assign(new Error(`net-audit: refused ${host}:${port}`), { code: "ECONNREFUSED" })));
  return sock;
};
