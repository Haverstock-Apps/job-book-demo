const test = require("node:test");
const assert = require("node:assert");
const { greeting } = require("../src/greeting");
const { page, version } = require("../build");

test("the greeting is a sentence", () => {
  assert.match(greeting(), /^[A-Z].*\.$/);
});

test("the page shows the greeting", () => {
  assert.ok(page().includes(greeting()));
});

test("version.json carries the commit it was built from", () => {
  const sha = "0123456789abcdef0123456789abcdef01234567";
  assert.deepStrictEqual(JSON.parse(version(sha)), { commit: sha });
});

test("a build with no commit refuses rather than publishing a blank version", () => {
  assert.throws(() => version(""), /commit/);
});
