/**
 * FIDE rating mathematics for EloForge.
 *
 * All tables and rules verified against:
 *  [F1] FIDE Rating Regulations (B.02, in force from 1 March 2024),
 *       https://handbook.fide.com/chapter/B022024  (verified October 2026)
 *  [W1] "Elo rating system", Wikipedia,
 *       https://en.wikipedia.org/wiki/Elo_rating_system  (verified October 2026)
 */

export type GameResult = 1 | 0.5 | 0;
export type KFactor = 40 | 20 | 10;
export type ExpectedMethod = 'fide-table' | 'logistic';

/** Player's rating must be at least the FIDE floor of 100 (B.02, 8.1). */
export const FIDE_RATING_FLOOR = 100;

/* ------------------------------------------------------------------ *
 * Table 8.1.2 - rating difference D → expected score PD  [F1]
 * Bands are inclusive: [minD, maxD] → PD for the HIGHER-rated player.
 * ------------------------------------------------------------------ */
const PD_BANDS: ReadonlyArray<readonly [number, number, number]> = [
  [0, 3, 0.5], [4, 10, 0.51], [11, 17, 0.52], [18, 25, 0.53], [26, 32, 0.54],
  [33, 39, 0.55], [40, 46, 0.56], [47, 53, 0.57], [54, 61, 0.58], [62, 68, 0.59],
  [69, 76, 0.6], [77, 83, 0.61], [84, 91, 0.62], [92, 98, 0.63], [99, 106, 0.64],
  [107, 113, 0.65], [114, 121, 0.66], [122, 129, 0.67], [130, 137, 0.68], [138, 145, 0.69],
  [146, 153, 0.7], [154, 162, 0.71], [163, 170, 0.72], [171, 179, 0.73], [180, 188, 0.74],
  [189, 197, 0.75], [198, 206, 0.76], [207, 215, 0.77], [216, 225, 0.78], [226, 235, 0.79],
  [236, 245, 0.8], [246, 256, 0.81], [257, 267, 0.82], [268, 278, 0.83], [279, 290, 0.84],
  [291, 302, 0.85], [303, 315, 0.86], [316, 328, 0.87], [329, 344, 0.88], [345, 357, 0.89],
  [358, 374, 0.9], [375, 391, 0.91], [392, 411, 0.92], [412, 432, 0.93], [433, 456, 0.94],
  [457, 484, 0.95], [485, 517, 0.96], [518, 559, 0.97], [560, 619, 0.98], [620, 735, 0.99],
  [736, Infinity, 1.0],
];

/**
 * Expected score from FIDE's official Table 8.1.2 lookup.
 * `diff` = playerRating − opponentRating (positive if the player is higher
 * rated). Returns the player's expected score for the game.
 */
export function expectedScoreFideTable(diff: number): number {
  const d = Math.round(diff);
  const ad = Math.abs(d);
  let h = 1;
  for (const [lo, hi, pd] of PD_BANDS) {
    if (ad >= lo && ad <= hi) {
      h = pd;
      break;
    }
  }
  // The complement is also an exact 2-decimal table value (e.g. .92 → .08);
  // round off binary-float noise so deltas stay exact.
  return d >= 0 ? h : Math.round((1 - h) * 100) / 100;
}

/**
 * Exact logistic expectation - the continuous curve behind the Elo system
 * [W1]:  E = 1 / (1 + 10^((Ropp − R) / 400))
 */
export function expectedScoreLogistic(diff: number): number {
  return 1 / (1 + Math.pow(10, -diff / 400));
}

/** Dispatch on method. */
export function expectedScore(diff: number, method: ExpectedMethod): number {
  return method === 'fide-table' ? expectedScoreFideTable(diff) : expectedScoreLogistic(diff);
}

/**
 * The 400-point rule (B.02, art. 8.3.1, as amended from 1 Oct 2025): a
 * difference of more than 400 points is counted as exactly 400 for players
 * rated below 2650. Players rated 2650+ use the true difference.
 */
export function apply400Cap(diff: number, playerRating: number, eligible = true): number {
  if (!eligible || playerRating >= 2650 || Math.abs(diff) <= 400) return diff;
  return Math.sign(diff) * 400;
}

/* ------------------------------------------------------------------ *
 * Table 8.1.1 - percentage score p → rating difference dp  [F1]
 * Used for performance ratings and initial ratings. Symmetric:
 * dp(1 − p) = −dp(p). Full scores score dp = ±800.
 * ------------------------------------------------------------------ */
const DP_TABLE: ReadonlyArray<number> = [
  /* p = .50 .. 1.00 in 0.01 steps */
  0, 7, 14, 21, 29, 36, 43, 50, 57, 65, 72, 80, 87, 95, 102, 110, 117, 125,
  133, 141, 149, 158, 166, 175, 184, 193, 202, 211, 220, 230, 240, 251, 262,
  273, 284, 296, 309, 322, 336, 351, 366, 383, 401, 422, 444, 470, 501, 538,
  589, 677, 800,
];

/**
 * dp for a percentage score p (0..1). FIDE reads p to two decimal places and
 * looks it up directly in Table 8.1.1 - no interpolation. Perfect scores give
 * dp = ±800, i.e. a lower bound on the true performance.
 */
export function dpFromP(p: number): number {
  const hundredths = Math.round(Math.min(1, Math.max(0, p)) * 100);
  if (hundredths === 50) return 0;
  if (hundredths > 50) return DP_TABLE[hundredths - 50];
  return -DP_TABLE[100 - hundredths - 50];
}

/* ------------------------------------------------------------------ *
 * K-factor - development coefficient (B.02, art. 8.3.3)  [F1]
 * ------------------------------------------------------------------ */
export interface KContext {
  /** Rated games completed so far (new players: K=40 until 30 games). */
  ratedGamesPlayed: number;
  /** True until the end of the year of the player's 18th birthday. */
  under18?: boolean;
  /** Current (or start-of-period) rating. */
  rating: number;
  /** Has the player ever had a published rating of 2400+? If so, K=10 permanently. */
  everReached2400?: boolean;
}

/** Determine the FIDE development coefficient K from a player's situation. */
export function autoK(ctx: KContext): KFactor {
  if (ctx.ratedGamesPlayed < 30) return 40;
  if (ctx.everReached2400) return 10;
  if (ctx.under18 && ctx.rating < 2300) return 40;
  return ctx.rating < 2400 ? 20 : 10;
}

/* ------------------------------------------------------------------ *
 * Rating change - B.02, art. 8.3  [F1]
 *   Delta R = score − PD   (per game, score is 1, 0.5 or 0)
 *   Rating change = Σ Delta R × K, rounded to the nearest whole number,
 *   0.5 away from zero, once per rating period (art. 8.3.4).
 * ------------------------------------------------------------------ */
export interface GameInput {
  rating: number;
  opponent: number;
  score: GameResult;
  k: KFactor;
  cap400?: boolean;
  method?: ExpectedMethod;
}

export interface GameOutcome {
  /** Rating difference after the 400-point rule, if applied. */
  dEff: number;
  /** Expected score E (PD) used for this game. */
  e: number;
  /** Per-game raw delta: K × (score − E). */
  delta: number;
  newRating: number;
}

/** One FIDE game: expected score, rating change and the resulting rating. */
export function playGame(input: GameInput): GameOutcome {
  const method = input.method ?? 'fide-table';
  const rawDiff = input.rating - input.opponent;
  const dEff = apply400Cap(rawDiff, input.rating, input.cap400 ?? true);
  const e = expectedScore(dEff, method);
  const delta = input.k * (input.score - e);
  return { dEff, e, delta, newRating: input.rating + delta };
}

/** FIDE rounding for a rating period: nearest whole, 0.5 away from zero. */
export function roundFide(x: number): number {
  const r = x >= 0 ? Math.floor(x + 0.5) : Math.ceil(x - 0.5);
  return r === 0 ? 0 : r; // normalize -0
}

/* ------------------------------------------------------------------ *
 * Performance rating  [F1 table 8.1.1] [W1]
 * ------------------------------------------------------------------ */
export interface PerfGame {
  opponent: number;
  score: GameResult;
}

export interface PerformanceReport {
  n: number;
  score: number;
  /** Percentage score, to two decimals (as FIDE reads it). */
  p: number;
  wins: number;
  draws: number;
  losses: number;
  /** Average rating of opponents, rounded to the nearest whole number. */
  ra: number;
  /** Score-based rating difference from Table 8.1.1. */
  dp: number;
  /** FIDE method: TPR = Ra + dp. */
  tprFide: number;
  /** Alternative: your own rating + the same score-based delta. */
  tprFromOwnRating: number | null;
  /** Linear "algorithm of 400": Ra + 400 × (W − L) / n. */
  tprLinear: number;
}

/**
 * Tournament performance rating, three ways.
 * - FIDE:       Rp = Ra + dp(p)                     [F1, W1]
 * - Own rating: Rp = R + dp(p)  ("rating + score-based delta")
 * - Linear:     Rp = Ra + 400 × (W − L) / n          [W1]
 * A perfect (or zero) score yields dp = ±800, which is only a bound - noted
 * by the caller, since any 100% score against the same field gives the same
 * number.
 */
export function performance(games: PerfGame[], ownRating: number | null): PerformanceReport | null {
  const n = games.length;
  if (n === 0) return null;
  let score = 0;
  let wins = 0;
  let losses = 0;
  let oppSum = 0;
  for (const g of games) {
    score += g.score;
    oppSum += g.opponent;
    if (g.score === 1) wins += 1;
    else if (g.score === 0) losses += 1;
  }
  const draws = n - wins - losses;
  const p = score / n;
  const pRounded = Math.round(p * 100) / 100;
  const ra = Math.round(oppSum / n);
  const dp = dpFromP(pRounded);
  return {
    n,
    score,
    p: pRounded,
    wins,
    draws,
    losses,
    ra,
    dp,
    tprFide: ra + dp,
    tprFromOwnRating: ownRating === null ? null : ownRating + dp,
    tprLinear: Math.round((ra + (400 * (wins - losses)) / n) * 10) / 10,
  };
}

/* ------------------------------------------------------------------ *
 * Rating goal planner
 * ------------------------------------------------------------------ */
export interface PlanOptions {
  start: number;
  target: number;
  opponent: number;
  /** Points per game you expect to score (1 = wins-only planning). */
  scoreRate: number;
  k: KFactor;
  cap400?: boolean;
  method?: ExpectedMethod;
}

export interface PlanStep {
  game: number;
  ratingBefore: number;
  delta: number;
  ratingAfter: number;
}

export interface PlanReport {
  reached: boolean;
  gamesNeeded: number;
  finalRating: number;
  steps: PlanStep[];
  /** True when the score rate cannot overcome the expected score. */
  stagnant: boolean;
}

/**
 * Simulate game after game (rating, K and expectation recomputed each round)
 * until the target rating is reached. Uses expected (average) deltas for
 * score rates below 1.0; wins-only uses exact per-game deltas.
 * FIDE actually settles ratings once per period - this is a projection.
 */
export function planToTarget(opts: PlanOptions, maxGames = 2000): PlanReport {
  const method = opts.method ?? 'fide-table';
  let rating = opts.start;
  let games = 0;
  const steps: PlanStep[] = [];
  let stagnant = false;

  while (rating < opts.target && games < maxGames) {
    const outcome = playGame({
      rating,
      opponent: opts.opponent,
      score: opts.scoreRate as GameResult,
      k: opts.k,
      cap400: opts.cap400 ?? true,
      method,
    });
    if (opts.scoreRate < 1 && outcome.delta <= 0) {
      stagnant = true;
      break;
    }
    games += 1;
    rating += outcome.delta;
    steps.push({ game: games, ratingBefore: steps.length ? steps[steps.length - 1].ratingAfter : opts.start, delta: outcome.delta, ratingAfter: rating });
  }

  return {
    reached: rating >= opts.target,
    gamesNeeded: games,
    finalRating: rating,
    steps,
    stagnant,
  };
}

/* ------------------------------------------------------------------ *
 * Formatting helpers
 * ------------------------------------------------------------------ */

/** Signed delta with one decimal, using a proper typographic minus. */
export function fmtDelta(x: number, decimals = 1): string {
  const s = Math.abs(x).toFixed(decimals);
  return (x < 0 ? '\u2212' : '+') + s;
}

/** Percentage score like 3.5 / 5 (70%). */
export function fmtPercent(p: number): string {
  return `${(p * 100).toFixed(p * 100 % 1 === 0 ? 0 : 1)}%`;
}
