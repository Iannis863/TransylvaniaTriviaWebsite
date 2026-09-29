import test from "node:test";
import assert from "node:assert/strict";
import { scoreWordleGuess } from "../shared/wordle.js";

test("Wordle allows a misplaced duplicate after an exact match", () => {
  assert.deepEqual(scoreWordleGuess("APPLE", "APLPA"), ["correct", "correct", "present", "present", "absent"]);
  assert.deepEqual(scoreWordleGuess("APPLE", "PAPAL"), ["present", "present", "correct", "absent", "present"]);
});

test("Wordle reserves exact matches before assigning misplaced letters", () => {
  assert.deepEqual(scoreWordleGuess("APPLE", "PUPPY"), ["present", "absent", "correct", "absent", "absent"]);
  assert.deepEqual(scoreWordleGuess("APPLE", "AAAAA"), ["correct", "absent", "absent", "absent", "absent"]);
  assert.deepEqual(scoreWordleGuess("APPLE", "EEEEE"), ["absent", "absent", "absent", "absent", "correct"]);
});

test("Wordle scores solved words and missing letters", () => {
  assert.deepEqual(scoreWordleGuess("APPLE", "APPLE"), Array(5).fill("correct"));
  assert.deepEqual(scoreWordleGuess("APPLE", "TOUCH"), Array(5).fill("absent"));
});
