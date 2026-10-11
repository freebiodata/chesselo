import { describe, expect, it } from 'vitest';
import {
  apply400Cap,
  autoK,
  dpFromP,
  expectedScoreFideTable,
  expectedScoreLogistic,
  fmtDelta,
  performance,
  playGame,
  planToTarget,
  roundFide,
} from '../src/lib/fide';

describe('expected score - FIDE Table 8.1.2', () => {
  it('anchor differences match the published table', () => {
    expect(expectedScoreFideTable(0)).toBe(0.5);
    expect(expectedScoreFideTable(100)).toBe(0.64);
    expect(expectedScoreFideTable(200)).toBe(0.76);
    expect(expectedScoreFideTable(300)).toBe(0.85);
    expect(expectedScoreFideTable(400)).toBe(0.92);
    expect(expectedScoreFideTable(500)).toBe(0.96);
    expect(expectedScoreFideTable(600)).toBe(0.98);
    expect(expectedScoreFideTable(700)).toBe(0.99);
    expect(expectedScoreFideTable(800)).toBe(1.0);
  });

  it('band edges are inclusive', () => {
    // D = 392..411 all read PD = .92
    expect(expectedScoreFideTable(392)).toBe(0.92);
    expect(expectedScoreFideTable(411)).toBe(0.92);
    expect(expectedScoreFideTable(391)).toBe(0.91);
    expect(expectedScoreFideTable(412)).toBe(0.93);
  });

  it('is symmetric for the lower-rated player', () => {
    expect(expectedScoreFideTable(-400)).toBe(0.08);
    expect(expectedScoreFideTable(-200)).toBe(0.24);
    expect(expectedScoreFideTable(0)).toBe(0.5);
  });

  it('spec vector: 2000 vs 2200 → expected 0.24', () => {
    expect(expectedScoreFideTable(2000 - 2200)).toBe(0.24);
  });
});

describe('expected score - logistic curve', () => {
  it('spec vector: 2000 vs 2200 → 0.240', () => {
    expect(expectedScoreLogistic(2000 - 2200)).toBeCloseTo(0.240, 3);
  });

  it('equal ratings → 0.5; ±400 → ~0.909/~0.091', () => {
    expect(expectedScoreLogistic(0)).toBe(0.5);
    expect(expectedScoreLogistic(400)).toBeCloseTo(0.9091, 4);
    expect(expectedScoreLogistic(-400)).toBeCloseTo(0.0909, 4);
  });
});

describe('rating change - delta = K × (S − E)', () => {
  it('spec vector: 2000 vs 2000, win, K=20 → +10', () => {
    const g = playGame({ rating: 2000, opponent: 2000, score: 1, k: 20 });
    expect(g.e).toBe(0.5);
    expect(g.delta).toBe(10);
    expect(g.newRating).toBe(2010);
  });

  it('spec vector: 2400 vs 2000, win, K=10 → +0.8 (FIDE table)', () => {
    const g = playGame({ rating: 2400, opponent: 2000, score: 1, k: 10, method: 'fide-table' });
    expect(g.e).toBe(0.92);
    expect(g.delta).toBeCloseTo(0.8, 10);
  });

  it('same game on the exact logistic curve → +0.9 (≈0.909)', () => {
    const g = playGame({ rating: 2400, opponent: 2000, score: 1, k: 10, method: 'logistic' });
    expect(g.e).toBeCloseTo(0.90909, 5);
    expect(g.delta).toBeCloseTo(10 * (1 - 1 / 1.1), 5);
  });

  it('draw against a stronger player gains points: 2000 vs 2200, K=20 → +5.2', () => {
    const g = playGame({ rating: 2000, opponent: 2200, score: 0.5, k: 20 });
    expect(g.e).toBe(0.24);
    expect(g.delta).toBeCloseTo(20 * (0.5 - 0.24), 10); // +5.2
  });

  it('loss pays the mirror penalty', () => {
    const g = playGame({ rating: 2000, opponent: 2000, score: 0, k: 20 });
    expect(g.delta).toBe(-10);
  });
});

describe('400-point rule (art. 8.3.1)', () => {
  it('caps differences above 400 for players rated below 2650', () => {
    expect(apply400Cap(700, 1500)).toBe(400);
    expect(apply400Cap(-560, 1500)).toBe(-400);
    expect(apply400Cap(400, 1500)).toBe(400);
    expect(apply400Cap(300, 1500)).toBe(300);
  });

  it('does not cap players rated 2650 or above (1 Oct 2025 amendment)', () => {
    expect(apply400Cap(700, 2700)).toBe(700);
  });

  it('feeds the capped difference into the game', () => {
    const g = playGame({ rating: 1400, opponent: 2400, score: 1, k: 40 });
    expect(g.dEff).toBe(-400);
    expect(g.e).toBe(0.08);
    expect(g.delta).toBeCloseTo(40 * 0.92, 10); // +36.8
  });
});

describe('FIDE rounding (art. 8.3.4)', () => {
  it('rounds to nearest whole, 0.5 away from zero', () => {
    expect(roundFide(0.5)).toBe(1);
    expect(roundFide(-0.5)).toBe(-1);
    expect(roundFide(2.5)).toBe(3);
    expect(roundFide(-2.5)).toBe(-3);
    expect(roundFide(0.4)).toBe(0);
    expect(roundFide(-0.4)).toBe(0);
    expect(roundFide(10)).toBe(10);
  });
});

describe('dp table 8.1.1 (score → rating difference)', () => {
  it('published anchors', () => {
    expect(dpFromP(1.0)).toBe(800);
    expect(dpFromP(0.99)).toBe(677);
    expect(dpFromP(0.92)).toBe(401);
    expect(dpFromP(0.9)).toBe(366);
    expect(dpFromP(0.8)).toBe(240);
    expect(dpFromP(0.7)).toBe(149);
    expect(dpFromP(0.6)).toBe(72);
    expect(dpFromP(0.5)).toBe(0);
    expect(dpFromP(0.08)).toBe(-401);
    expect(dpFromP(0.0)).toBe(-800);
  });

  it('is antisymmetric', () => {
    expect(dpFromP(0.7)).toBe(-dpFromP(0.3));
    expect(dpFromP(0.96)).toBe(-dpFromP(0.04));
  });
});

describe('K-factor (art. 8.3.3)', () => {
  it('new players: K=40 until 30 rated games', () => {
    expect(autoK({ ratedGamesPlayed: 0, rating: 1200 })).toBe(40);
    expect(autoK({ ratedGamesPlayed: 29, rating: 2000 })).toBe(40);
    expect(autoK({ ratedGamesPlayed: 30, rating: 2000 })).toBe(20);
  });

  it('under-18 players keep K=40 while rated under 2300', () => {
    expect(autoK({ ratedGamesPlayed: 30, rating: 2100, under18: true })).toBe(40);
    expect(autoK({ ratedGamesPlayed: 30, rating: 2350, under18: true })).toBe(20);
    expect(autoK({ ratedGamesPlayed: 30, rating: 2100, under18: false })).toBe(20);
  });

  it('K=10 is permanent once 2400 has been published', () => {
    expect(autoK({ ratedGamesPlayed: 60, rating: 2450 })).toBe(10);
    expect(autoK({ ratedGamesPlayed: 60, rating: 2380, everReached2400: true })).toBe(10);
    expect(autoK({ ratedGamesPlayed: 60, rating: 2380 })).toBe(20);
  });
});

describe('performance rating', () => {
  it('4/4 against 2000-average field → FIDE TPR = 2800 (perfect score bound)', () => {
    const r = performance(
      [
        { opponent: 1950, score: 1 },
        { opponent: 2000, score: 1 },
        { opponent: 2050, score: 1 },
        { opponent: 2000, score: 1 },
      ],
      1800,
    );
    expect(r!.p).toBe(1);
    expect(r!.ra).toBe(2000);
    expect(r!.dp).toBe(800);
    expect(r!.tprFide).toBe(2800);
    expect(r!.tprFromOwnRating).toBe(2600);
    expect(r!.tprLinear).toBe(2400);
  });

  it('6.5/9 (p=0.72) vs 2200-average field → dp=166, TPR=2366', () => {
    const games = [
      { opponent: 2200, score: 1 as const },
      { opponent: 2150, score: 1 as const },
      { opponent: 2300, score: 0.5 as const },
      { opponent: 2250, score: 1 as const },
      { opponent: 2100, score: 1 as const },
      { opponent: 2200, score: 0.5 as const },
      { opponent: 2350, score: 1 as const },
      { opponent: 2200, score: 0 as const },
      { opponent: 2050, score: 0.5 as const },
    ];
    const r = performance(games, 2100);
    expect(r!.n).toBe(9);
    expect(r!.score).toBeCloseTo(6.5, 10);
    expect(r!.p).toBe(0.72);
    expect(r!.dp).toBe(166);
    expect(r!.tprFide).toBe(r!.ra + 166);
    expect(r!.tprFromOwnRating).toBe(2266);
    // W5 D3 L1 → linear = Ra + 400×4/9
    expect(r!.tprLinear).toBeCloseTo(r!.ra + 177.8, 1);
  });

  it('rounds p to two decimals before lookup, per FIDE usage', () => {
    // 5/7 = 0.714… → reads as p = 0.71 → dp = 158
    const games = Array.from({ length: 7 }, (_, i) => ({
      opponent: 2000,
      score: (i < 5 ? 1 : 0) as 1 | 0,
    }));
    const r = performance(games, null);
    expect(r!.p).toBe(0.71);
    expect(r!.dp).toBe(158);
    expect(r!.tprFromOwnRating).toBeNull();
  });
});

describe('rating goal planner', () => {
  it('wins vs equal opposition: +10 then diminishing', () => {
    const r = planToTarget({ start: 1200, target: 1250, opponent: 1200, scoreRate: 1, k: 20 });
    expect(r.reached).toBe(true);
    expect(r.steps[0].delta).toBe(10);
    expect(r.steps.length).toBeGreaterThan(4);
    expect(r.steps.length).toBeLessThan(10);
    expect(r.finalRating).toBeGreaterThanOrEqual(1250);
  });

  it('flags a stagnant plan when the score rate cannot beat expectation', () => {
    const r = planToTarget({ start: 2000, target: 2100, opponent: 2400, scoreRate: 0.08, k: 20 });
    expect(r.stagnant).toBe(true);
    expect(r.reached).toBe(false);
  });
});

describe('formatting', () => {
  it('uses a typographic minus and one decimal', () => {
    expect(fmtDelta(0.8)).toBe('+0.8');
    expect(fmtDelta(-5.2)).toBe('\u22125.2');
    expect(fmtDelta(10)).toBe('+10.0');
  });
});
