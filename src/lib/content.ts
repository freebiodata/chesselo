/** FAQ content shared by the home page, /faq and the FAQPage JSON-LD. */

export interface FaqItem {
  id: string;
  q: string;
  /** Plain-text answer for JSON-LD (derived automatically when omitted). */
  a: string;
  jsonld?: string;
}

const plain = (html: string) => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

const rawFaqs: { id: string; q: string; a: string }[] = [
  {
    id: 'k-factor',
    q: 'What K-factor am I?',
    a: `Under the FIDE Rating Regulations (art. 8.3.3) the development coefficient K depends on your history:
      <ul>
        <li><strong>K = 40</strong> when you are new to the rating list - until you have completed events with at least <strong>30 rated games</strong>.</li>
        <li><strong>K = 40</strong> for all players <strong>until the end of the year of their 18th birthday</strong>, as long as their rating stays under 2300.</li>
        <li><strong>K = 20</strong> as long as your rating remains under 2400.</li>
        <li><strong>K = 10</strong> once your published rating has reached 2400 - and it stays at 10 permanently, even if you later drop below 2400.</li>
      </ul>
      <p>In short: most adult club players who have played 30+ rated games sit at K = 20. New players and juniors move twice as fast with K = 40, which is why ratings converge quickly at first.</p>
      <p>One more clause from the same article: if the number of games in a rating period multiplied by K would exceed 700, K is reduced to the largest whole number that keeps K × games at or below 700.</p>`,
  },
  {
    id: 'performance-rating',
    q: 'How is performance rating calculated?',
    a: `<p>The FIDE method works in two steps. First take the average rating of your opponents, <em>R<sub>a</sub></em>. Then convert your percentage score <em>p</em> into a rating difference <em>d<sub>p</sub></em> using FIDE Table 8.1.1, and add it:</p>
      <p><em>TPR = R<sub>a</sub> + d<sub>p</sub></em></p>
      <p>Scoring 50% gives d<sub>p</sub> = 0, so your performance equals the field's average. A perfect 100% score gives d<sub>p</sub> = +800 - which is really a <em>lower bound</em>: any 100% score against the same opponents produces the same number. An alternative convention anchors the same delta to your own rating instead: performance = your rating + d<sub>p</sub>. A third, cruder method ("the algorithm of 400") adds 400 × (wins − losses) / games to the opponents' average.</p>
      <p><a href="/performance-rating">Try the performance rating calculator →</a></p>`,
  },
  {
    id: 'elo-formula',
    q: 'What is the Elo rating formula?',
    a: `<p>Each game, your expected score is <em>E = 1 / (1 + 10<sup>(R<sub>opp</sub> − R<sub>you</sub>)/400</sup>)</em>. After the game your rating changes by <em>ΔR = K × (S − E)</em>, where S is your actual score (1, ½ or 0) and K is your development coefficient. Beat a higher-rated player and S − E is a large positive number; lose to a lower-rated one and it bites hard in the other direction.</p>
      <p>FIDE itself reads E from its official table (Table 8.1.2) rather than the raw curve - at a 400-point gap the table gives exactly 0.92, where the curve gives about 0.909. Both are shown side by side in our <a href="/elo-calculator">elo calculator</a>.</p>`,
  },
  {
    id: '400-rule',
    q: 'What is the 400-point rule?',
    a: `<p>For rating purposes, FIDE caps the rating difference between you and a single opponent at 400 points (Rating Regulations, art. 8.3.1). If you are rated 1500 and lose to a 2200 grandmaster, the game counts as a 400-point upset loss, not a 700-point one - you lose only what a 1900-rated opponent would lose. From 1 October 2025 the cap applies to players rated below 2650; players rated 2650 or above have their true difference counted, so elite mismatches move ratings again.</p>`,
  },
  {
    id: 'expected-vs-win',
    q: 'Expected score vs. win probability - what is the difference?',
    a: `<p>The expected score counts a draw as half a win, so E = 0.76 means "76 points per 100 games", not "76% chance of winning". The split between wins, draws and losses depends on style, opening and how drawish your level is - Elo only pins the total. Two players can both sit at E = 0.76 with completely different win/draw/loss shapes.</p>
      <p><a href="/expected-score">Compute your expected score →</a></p>`,
  },
  {
    id: 'gain-points',
    q: 'How many games to gain 100 rating points?',
    a: `<p>It depends on K, your opponents and your scoring rate - there is no fixed number. Beating equal-rated opposition at K = 20 yields +10 per win and −10 per loss, so you need a clear net surplus of wins. The <a href="/rating-planner">rating goal planner</a> simulates this round by round: for example, a 1600 player on K = 20 winning every game against 1600 opponents reaches 1700 in about 11 games, because each win pays a little less as the gap grows.</p>`,
  },
  {
    id: 'good-rating',
    q: 'What is a good chess rating?',
    a: `<p>A rough adult scale: below 1200 is a beginner, 1200–1600 intermediate club level, 1600–2000 strong club player, 2000–2200 expert/candidate master territory, 2200+ is FIDE master country (FM is awarded at a published 2300), 2400+ international master strength, and 2500+ is grandmaster strength. Context matters more than the number - a 1900 in a small federation's league is a serious player locally.</p>`,
  },
  {
    id: 'norms',
    q: 'What performance rating do I need for a GM or IM norm?',
    a: `<p>By the FIDE Title Regulations (art. 1.4), a <strong>GM norm requires a performance of at least 2600</strong> and an <strong>IM norm at least 2450</strong>, over at least 9 games (with a few exceptions for elite team events), against opponents averaging at least 2380 (GM) or 2230 (IM), scoring at least 35%, with the required mix of titled opponents and federations. The title itself is awarded after norms covering at least 27 games plus a published rating of 2500 (GM) or 2400 (IM). Our <a href="/performance-rating">performance calculator</a> flags these benchmarks.</p>`,
  },
  {
    id: 'uscf-fide',
    q: 'Are FIDE and USCF ratings the same?',
    a: `<p>No. USCF (the United States Chess Federation) runs its own Elo-based system with different K-values, a 100-point floor mechanism, bonus points for fast improvers, and a rating pool that skews a few dozen to a hundred points <em>higher</em> than FIDE at the same objective strength in the mid-range. A 1800 USCF player is typically somewhere near 1650–1750 FIDE. The formulas on this site follow FIDE rules; the same logistic engine, different plumbing.</p>`,
  },
  {
    id: 'provisional',
    q: 'Why did my first rating move so fast?',
    a: `<p>Because of K = 40. For your first 30 rated games every result swings 40 × (S − E) points - a win against an equal opponent is +20, not +10. FIDE also publishes new players' ratings from as few as 5 rated games in one event (initial rating = average of opponents + d<sub>p</sub>, plus two hypothetical 1800 draws, capped at 2200). Once you pass 30 games the system deliberately slows you down.</p>`,
  },
];

export const faqs: FaqItem[] = rawFaqs.map(({ id, q, a }) => ({
  id,
  q,
  a,
  jsonld: plain(a),
}));

export const homeFaqs = ['k-factor', 'performance-rating', 'elo-formula', '400-rule'];

export const faqJsonLd = (subset?: string[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqs
    .filter((f) => !subset || subset.includes(f.id))
    .map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.jsonld },
    })),
});

/** Sources cited across the site - [F1], [W1], [F2]. */
export const sources = [
  {
    no: 'F1',
    title: 'FIDE Rating Regulations (B.02), in force from 1 March 2024',
    note: 'K-factor (art. 8.3.3), 400-point rule as amended from 1 Oct 2025 (art. 8.3.1), rating change & rounding (art. 8.3), Tables 8.1.1 & 8.1.2, initial rating (art. 8.2).',
    url: 'https://handbook.fide.com/chapter/B022024',
  },
  {
    no: 'F2',
    title: 'FIDE Title Regulations (B.01), effective from 1 January 2024',
    note: 'Norm requirements (art. 1.4): GM 2600 / IM 2450 performance, 9+ games, opponent averages, titled-player mix; title award thresholds (art. 1.5).',
    url: 'https://handbook.fide.com/chapter/B012024',
  },
  {
    no: 'W1',
    title: 'Elo rating system - Wikipedia',
    note: 'The logistic expected-score model, the linear "algorithm of 400" performance method, and historical context of Arpad Elo\'s system.',
    url: 'https://en.wikipedia.org/wiki/Elo_rating_system',
  },
];
