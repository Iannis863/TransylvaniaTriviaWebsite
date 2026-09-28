export const TARGET_OPERATORS = ["+", "-", "*", "/"] as const;
export type TargetOperator = typeof TARGET_OPERATORS[number];
export const OPERATOR_LABELS: Record<TargetOperator, string> = { "+": "+", "-": "−", "*": "×", "/": "÷" };
export interface TargetMove { leftId: number; rightId: number; operator: TargetOperator }
export interface TargetToken { id: number; value: number; expression: string }
export interface TargetPuzzle { numbers: number[]; target: number; solution: TargetMove[]; hint: string }

// Forty distinct weekly puzzles: two short steps, small starting numbers,
// and no fractional or negative results. Repeat only after the full 40-week cycle.
const RECIPES: [number, TargetOperator, number, TargetOperator, number][] = [
  [3, "*", 4, "+", 2], [7, "-", 2, "*", 3], [8, "/", 2, "+", 5],
  [4, "+", 5, "*", 2], [6, "*", 3, "-", 4], [9, "/", 3, "+", 7],
  [8, "-", 3, "*", 4], [2, "+", 7, "*", 3], [5, "*", 4, "-", 6],
  [6, "/", 2, "+", 8], [9, "-", 4, "*", 2], [3, "*", 5, "+", 7],
  [8, "/", 4, "+", 9], [6, "+", 2, "*", 5], [7, "*", 3, "-", 5],
  [9, "-", 5, "*", 3], [4, "*", 6, "+", 2], [8, "/", 2, "*", 7],
  [5, "+", 3, "*", 4], [9, "*", 2, "-", 6], [6, "/", 3, "+", 4],
  [7, "-", 3, "*", 5], [2, "*", 8, "+", 6], [9, "-", 2, "*", 4],
  [5, "*", 3, "-", 2], [6, "/", 3, "+", 2], [8, "-", 2, "*", 3],
  [9, "+", 2, "*", 3], [7, "*", 2, "+", 4], [8, "+", 4, "/", 2],
  [7, "-", 5, "+", 2], [9, "*", 2, "-", 5], [7, "-", 2, "*", 6],
  [9, "+", 7, "/", 2], [9, "+", 8, "-", 2], [7, "-", 3, "*", 4],
  [9, "/", 3, "*", 4], [6, "+", 3, "*", 5], [8, "-", 5, "*", 3],
  [7, "*", 3, "-", 6],
];

export function targetCalculation(left: number, operator: TargetOperator, right: number): number | null {
  if (!Number.isSafeInteger(left) || !Number.isSafeInteger(right) || left < 0 || right < 0) return null;
  let result: number;
  switch (operator) {
    case "+": result = left + right; break;
    case "-": result = left - right; break;
    case "*": result = left * right; break;
    case "/": if (right === 0) return null; result = left / right; break;
    default: return null;
  }
  return Number.isSafeInteger(result) && result >= 0 && result <= 1000 ? result : null;
}

export function initialTargetTokens(puzzle: TargetPuzzle): TargetToken[] {
  return puzzle.numbers.map((value, index) => ({ id: 1 << index, value, expression: String(value) }));
}

export function applyTargetMove(tokens: TargetToken[], move: TargetMove): TargetToken[] | null {
  const left = tokens.find(token => token.id === move.leftId);
  const right = tokens.find(token => token.id === move.rightId);
  if (!left || !right || (left.id & right.id) !== 0) return null;
  const value = targetCalculation(left.value, move.operator, right.value);
  if (value === null) return null;
  return [...tokens.filter(token => token !== left && token !== right), {
    id: left.id | right.id, value,
    expression: `(${left.expression} ${OPERATOR_LABELS[move.operator]} ${right.expression})`,
  }];
}

export function getTargetPuzzle(weekIndex: number): TargetPuzzle {
  if (!Number.isSafeInteger(weekIndex) || weekIndex < 0 || weekIndex > 10000) throw new RangeError("Invalid puzzle week");
  const [a, firstOperator, b, secondOperator, c] = RECIPES[weekIndex % RECIPES.length];
  const numbers = [a, b, c].sort((left, right) => left - right);
  const id = (value: number) => 1 << numbers.indexOf(value);
  const intermediate = targetCalculation(a, firstOperator, b)!;
  return {
    numbers, target: targetCalculation(intermediate, secondOperator, c)!,
    solution: [
      { leftId: id(a), rightId: id(b), operator: firstOperator },
      { leftId: id(a) | id(b), rightId: id(c), operator: secondOperator },
    ],
    hint: `Încearcă să începi cu ${a} ${OPERATOR_LABELS[firstOperator]} ${b} = ${intermediate}. Apoi folosește și ${c}.`,
  };
}

// Replay submitted moves; accept any valid solution, not only the suggested one.
export function isTargetSolution(puzzle: TargetPuzzle, moves: unknown): boolean {
  if (!Array.isArray(moves) || moves.length !== 2) return false;
  let tokens = initialTargetTokens(puzzle);
  for (const move of moves) {
    if (!move || typeof move !== "object" || !TARGET_OPERATORS.includes(move.operator)) return false;
    const next = applyTargetMove(tokens, move);
    if (!next) return false;
    tokens = next;
  }
  return tokens.length === 1 && tokens[0].id === 7 && tokens[0].value === puzzle.target;
}
