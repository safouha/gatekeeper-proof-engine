import assert from "node:assert/strict";
import test from "node:test";
import { analyzeDiff, createReceipt } from "../lib/analyzer.ts";
import { DEMOS } from "../lib/demos.ts";

test("detects authorization and disabled-test regressions", () => {
  const analysis = analyzeDiff(DEMOS.auth.diff);
  assert.equal(analysis.verdict, "BLOCK");
  assert.ok(analysis.findings.some((finding) => finding.rule === "AUTH-04"));
  assert.ok(analysis.findings.some((finding) => finding.rule === "TEST-09"));
  assert.equal(analysis.files.length, 2);
});

test("treats a clean refactor as shippable but still creates a proof contract", () => {
  const analysis = analyzeDiff(DEMOS.refactor.diff);
  assert.equal(analysis.verdict, "SHIP");
  assert.equal(analysis.findings.length, 0);
  assert.equal(analysis.probes.length, 1);
});

test("release receipts are deterministic for the same analysis", () => {
  const analysis = analyzeDiff(DEMOS.payments.diff);
  assert.deepEqual(createReceipt(analysis), createReceipt(analysis));
  assert.match(createReceipt(analysis).fingerprint, /^GK-[A-F0-9]{8}-[A-F0-9]{8}$/);
});
