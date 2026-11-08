import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import * as api from "../src/index.js";

const root = new URL("..", import.meta.url);

test("public exports stay limited to the documented surface", () => {
  assert.deepEqual(Object.keys(api).sort(), [
    "ARMOR_CONSTANT",
    "DEFAULT_MITIGATION_CAP",
    "FORMULA",
    "mitigate",
    "saturatingHyperbolic"
  ]);
  assert.equal(typeof api.mitigate, "function");
  assert.equal(typeof api.saturatingHyperbolic, "function");
  assert.equal(api.FORMULA, "saturating-hyperbolic");
  assert.equal(api.ARMOR_CONSTANT, 100);
  assert.equal(api.DEFAULT_MITIGATION_CAP, 0.75);
});

test("package metadata names the module and the author", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.equal(pkg.name, "@aneron/armor-mit");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.author, "Vadim Gubin");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.sideEffects, false);
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.optionalDependencies, undefined);
  assert.equal(pkg.peerDependencies, undefined);
  assert.equal(pkg.main, "./src/index.js");
  assert.equal(pkg.exports, "./src/index.js");
  assert.equal(pkg.repository.type, "git");
  assert.equal(pkg.repository.url, "git+https://github.com/ANERON-GAMES/armor-mit.git");
  assert.deepEqual(pkg.files, ["src", "LICENSE", "README.md"]);
  assert.equal(pkg.scripts.test, "node --test test/*.test.js");
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.equal(pkg.scripts.format, "prettier --write .");
  assert.equal(pkg.scripts["format:check"], "prettier --check .");
  assert.deepEqual(Object.keys(pkg.scripts).sort(), ["format", "format:check", "lint", "test"]);
  assert.deepEqual(Object.keys(pkg.devDependencies).sort(), [
    "@eslint/js",
    "eslint",
    "eslint-config-prettier",
    "globals",
    "prettier"
  ]);
  const license = readFileSync(new URL("LICENSE", root), "utf8");
  assert.equal(license.split("\n").includes("Copyright (c) 2026 Vadim Gubin"), true);
  assert.equal(license.includes("anerongames"), false);
  const readme = readFileSync(new URL("README.md", root), "utf8");
  for (const heading of [
    "## Purpose",
    "## Install",
    "## Usage",
    "## API",
    "## Design notes",
    "## License"
  ]) {
    assert.equal(readme.includes(heading + "\n"), true, heading);
  }
  for (const phrase of [
    "`open.taken` is `100`",
    "`open.absorbed` is `0`",
    "`open.mitigation` is `0`",
    "`open.cap` is `0.75`",
    "`partial.taken` is `60`",
    "`partial.absorbed` is `40`",
    "`partial.mitigation` is `0.4`",
    "`capped.taken` is `25`",
    "`capped.absorbed` is `75`",
    "`capped.mitigation` is `0.75`",
    "`capped.uncapped` is `0.75`",
    "`saturated.uncapped` is `1`",
    "`saturated.mitigation` is `0.75`",
    "`saturated.taken` is `25`",
    "`piled.taken` is `25`",
    "`blocked.taken` is `0`",
    "`blocked.absorbed` is `100`",
    "`blocked.mitigation` is `1`",
    "`below.taken` is `60`",
    "`half.taken` is `50`",
    "`half.mitigation` is `0.5`",
    "`pierced.taken` is `60`",
    "`pierced.effectiveArmor` is `25`",
    "`opened.taken` is `25`",
    "`opened.effectiveArmor` is `60`",
    "`stripped.taken` is `100`",
    "`stripped.effectiveArmor` is `0`",
    "`transparent.taken` is `100`",
    "`transparent.mitigation` is `0`",
    "`none.taken` is `0`",
    "`none.absorbed` is `0`",
    "`none.mitigation` is `1`",
    "`first.taken` is `60`",
    "`second.taken` is `25`",
    "`left.taken` is `60`",
    "`right.taken` is `60`",
    "`saturatingHyperbolic(0)` is `0`",
    "`saturatingHyperbolic(20)` is `1/3`",
    "`saturatingHyperbolic(25)` is `0.4`",
    "`saturatingHyperbolic(40)` is `4/7`",
    "`saturatingHyperbolic(60)` is `0.75`",
    "`saturatingHyperbolic(80)` is `8/9`",
    "`saturatingHyperbolic(100)` is `1`",
    "saturating-hyperbolic",
    "Copyright (c) 2026 Vadim Gubin"
  ]) {
    assert.equal(readme.includes(phrase), true, phrase);
  }
  const workflow = readFileSync(new URL(".github/workflows/ci.yml", root), "utf8");
  assert.equal(workflow.includes("node-version: [20, 22]"), true);
  assert.equal(workflow.includes("npm ci"), true);
  assert.equal(workflow.includes("npm test"), true);
  assert.equal(workflow.includes("npm run lint"), true);
  assert.equal(workflow.includes("npm run format:check"), true);
});

test("source files do not contain comments, clocks, timers, or network calls", () => {
  const files = readdirSync(new URL("src/", root)).sort();
  assert.deepEqual(files, ["constants.js", "curve.js", "index.js", "mitigate.js", "read.js"]);
  for (const name of files) {
    const source = readFileSync(new URL("src/" + name, root), "utf8");
    const specifiers = source.match(/from "[^"]+"/g) ?? [];
    assert.equal(specifiers.length > 0 || source.includes("import ") === false, true, name);
    for (const specifier of specifiers) {
      assert.match(specifier, /^from "\.\/[a-z]+\.js"$/);
    }
    assert.equal(source.includes("node:"), false, name);
    assert.equal(source.includes("require("), false, name);
    assert.equal(source.includes("/*"), false, name);
    assert.equal(source.includes("//"), false, name);
    assert.equal(source.includes("console"), false, name);
    for (const token of [
      "Date",
      "setTimeout",
      "setInterval",
      "Math.random",
      "process",
      "fetch(",
      "globalThis",
      "queueMicrotask",
      "setImmediate",
      "performance"
    ]) {
      assert.equal(source.includes(token), false, name + " " + token);
    }
  }
});

test("the tree does not name private systems or carry addresses", () => {
  const files = ["README.md", "LICENSE", "package.json", "eslint.config.js"];
  const directories = ["src", "test", ".github"];
  const chunks = [];
  for (const name of files) {
    chunks.push(readFileSync(new URL(name, root), "utf8"));
  }
  for (const directory of directories) {
    const entries = readdirSync(new URL(directory + "/", root), { recursive: true });
    for (const entry of entries) {
      if (
        typeof entry !== "string" ||
        (entry.endsWith(".js") === false && entry.endsWith(".yml") === false)
      ) {
        continue;
      }
      chunks.push(readFileSync(new URL(directory + "/" + entry, root), "utf8"));
    }
  }
  const text = chunks.join("\n").toLowerCase();
  const banned = [
    "pocket" + "base",
    "blood" + "rain",
    "pc-" + "server",
    "messen" + "ger",
    "bot" + "s"
  ];
  for (const token of banned) {
    assert.equal(text.includes(token), false, token);
  }
});

test("the lockfile resolves only from the npm registry", () => {
  const lockPath = new URL("package-lock.json", root);
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.equal(lock.lockfileVersion >= 2, true);
  const text = readFileSync(lockPath, "utf8");
  assert.equal(text.includes("git+"), false);
  assert.equal(text.includes("github:"), false);
  assert.equal(text.includes("registry.yarnpkg.com"), false);
  let resolved = 0;
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (value !== null && typeof value === "object") {
      if (typeof value.resolved === "string") {
        resolved += 1;
        assert.equal(
          value.resolved.startsWith("https://registry.npmjs.org/"),
          true,
          value.resolved
        );
      }
      for (const key of Object.keys(value)) {
        walk(value[key]);
      }
    }
  };
  walk(lock);
  assert.equal(resolved > 0, true);
});
