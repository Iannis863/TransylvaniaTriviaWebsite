// ─────────────────────────────────────────────────────────────
// Quizzability Scoring Engine — Public API
// Re-exports everything needed to use the engine from outside.
// ─────────────────────────────────────────────────────────────

export { scoreQuizzability } from "./engine.js";
export { runCalibration } from "./calibration.js";
export { recognizeDomain } from "./domains.js";
export type { DomainRecognition } from "./domains.js";
export { DEFAULT_WEIGHTS, VERDICT_THRESHOLDS } from "./config.js";
export type {
  QuizzabilityResult,
  QuizzabilitySignals,
  QuizzabilityWeights,
  Verdict,
  VerifiabilityFlag,
} from "./types.js";
