import test from "node:test";
import assert from "node:assert/strict";
import { shouldApplyStatus } from "../lib/signwell-status.ts";

test("a late viewed event cannot undo completed", () => {
  assert.equal(shouldApplyStatus("completed", "viewed"), false);
  assert.equal(shouldApplyStatus("completed", "sent"), false);
});
test("final states stay put, except a real completion", () => {
  assert.equal(shouldApplyStatus("declined", "viewed"), false);
  assert.equal(shouldApplyStatus("expired", "sent"), false);
  assert.equal(shouldApplyStatus("canceled", "completed"), true);
});
test("normal forward progress is applied", () => {
  assert.equal(shouldApplyStatus("sent", "viewed"), true);
  assert.equal(shouldApplyStatus("viewed", "in_progress"), true);
  assert.equal(shouldApplyStatus("partially_signed", "completed"), true);
  assert.equal(shouldApplyStatus("viewed", "declined"), true);
});
test("backwards progress is ignored", () => {
  assert.equal(shouldApplyStatus("viewed", "sent"), false);
  assert.equal(shouldApplyStatus("partially_signed", "viewed"), false);
});
test("error is not final", () => {
  assert.equal(shouldApplyStatus("error", "sent"), true);
  assert.equal(shouldApplyStatus("viewed", "error"), true);
});
