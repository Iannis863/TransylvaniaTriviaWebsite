export type WordleLetterStatus = "correct" | "present" | "absent";

export function scoreWordleGuess(target: string, guess: string): WordleLetterStatus[] {
  const statuses: WordleLetterStatus[] = Array.from(guess, () => "absent");
  const remaining = new Map<string, number>();

  // Exact matches consume letters first, regardless of their position in the guess.
  for (let index = 0; index < target.length; index++) {
    const letter = target[index];
    if (guess[index] === letter) statuses[index] = "correct";
    else remaining.set(letter, (remaining.get(letter) ?? 0) + 1);
  }

  for (let index = 0; index < guess.length; index++) {
    if (statuses[index] === "correct") continue;
    const letter = guess[index];
    const count = remaining.get(letter) ?? 0;
    if (count > 0) {
      statuses[index] = "present";
      remaining.set(letter, count - 1);
    }
  }

  return statuses;
}
