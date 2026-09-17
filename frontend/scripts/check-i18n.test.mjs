import { test } from "node:test";
import assert from "node:assert/strict";
import { catalogErrors } from "./check-i18n.mjs";
test("detects TODO, key mismatch, English leakage and broken interpolation", () => {
  assert(catalogErrors({ a: "TODO: Hello", b: "Hello" }, { a: "Hello {{name}}", c: "Next" }, "as").length >= 3);
  assert(catalogErrors({ a: "Hello" }, { a: "Hello" }, "bn").some((e) => e.includes("untranslated")));
  assert.deepEqual(catalogErrors({ a: "নমস্কাৰ {{name}}" }, { a: "Hello {{name}}" }, "as"), []);
});
