// Builds the published site into _site/: the page, and version.json — the address Job Book's live check reads.
// version.json holds the commit this build came from (GITHUB_SHA in Actions), so "is the change live?" has an answer.
const fs = require("node:fs");
const path = require("node:path");
const { greeting } = require("./src/greeting");

function page() {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Job Book demo</title></head>
<body style="font:18px/1.6 system-ui,sans-serif;max-width:40rem;margin:4rem auto;padding:0 16px">
<h1>${greeting()}</h1>
<p>The running commit is at <a href="version.json">version.json</a>.</p>
</body></html>
`;
}

function version(commit) {
  const c = String(commit || "").trim().toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(c)) throw new Error("no commit to stamp: set GITHUB_SHA to the full commit id");
  return JSON.stringify({ commit: c }) + "\n";
}

if (require.main === module) {
  const out = path.join(__dirname, "_site");
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, "index.html"), page());
  fs.writeFileSync(path.join(out, "version.json"), version(process.env.GITHUB_SHA));
  console.log(`built _site for ${process.env.GITHUB_SHA}`);
}

module.exports = { page, version };
