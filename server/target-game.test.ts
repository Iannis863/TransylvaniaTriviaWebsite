import test from "node:test";
import assert from "node:assert/strict";
import { applyTargetMove, getTargetPuzzle, initialTargetTokens, isTargetSolution, targetCalculation } from "../shared/target-game.js";

test("target puzzles are deterministic, short, solvable, and change every week", () => {
  for (let week = 0; week <= 10000; week++) {
    const puzzle = getTargetPuzzle(week);
    assert.equal(puzzle.numbers.length, 3);
    assert.equal(new Set(puzzle.numbers).size, 3);
    assert.ok(puzzle.numbers.every(n => n >= 2 && n <= 9));
    assert.ok(puzzle.target > 0 && puzzle.target <= 50);
    assert.equal(isTargetSolution(puzzle, puzzle.solution), true);
    assert.deepEqual(getTargetPuzzle(week), puzzle);
    if (week < 10000) assert.notDeepEqual(puzzle.numbers, getTargetPuzzle(week + 1).numbers);
  }
});

test("target accepts alternative solutions and enforces using every tile once", () => {
  const puzzle = getTargetPuzzle(0); // 2, 3, 4 -> 14
  assert.equal(isTargetSolution(puzzle, [
    { leftId: 2, operator: "+", rightId: 4 },
    { leftId: 6, operator: "*", rightId: 1 },
  ]), true); // (3 + 4) * 2 rather than (3 * 4) + 2
  const initial = initialTargetTokens(puzzle);
  const next = applyTargetMove(initial, puzzle.solution[0])!;
  assert.equal(initial.length, 3, "Original state is preserved for undo");
  assert.equal(next.length, 2);
  assert.equal(applyTargetMove(initial, { leftId: 1, rightId: 1, operator: "+" }), null);
  assert.equal(applyTargetMove(next, puzzle.solution[0]), null, "Consumed tiles cannot be reused");
  assert.equal(isTargetSolution(puzzle, puzzle.solution.slice(0, 1)), false);
  assert.equal(isTargetSolution(puzzle, [...puzzle.solution, puzzle.solution[0]]), false);
  assert.equal(isTargetSolution(puzzle, [puzzle.solution[0], { leftId: 6, rightId: 1, operator: "-" }]), false);
  for (const malformed of [null, {}, [null, null], [{ operator: "eval" }, {}], [{ leftId: "1" }, {}]]) {
    assert.equal(isTargetSolution(puzzle, malformed), false);
  }
});

test("target arithmetic rejects fractions, negatives, division by zero, and invalid operands", () => {
  assert.equal(targetCalculation(8, "/", 2), 4);
  assert.equal(targetCalculation(5, "/", 2), null);
  assert.equal(targetCalculation(5, "/", 0), null);
  assert.equal(targetCalculation(2, "-", 5), null);
  assert.equal(targetCalculation(2, "-", 2), 0);
  assert.equal(targetCalculation(Infinity, "+", 2), null);
  assert.equal(targetCalculation(1.5, "+", 2), null);
  assert.equal(targetCalculation(1000, "*", 1000), null);
});
