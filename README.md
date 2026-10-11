# EloForge - chesselo.top

Free chess rating calculators built on the official FIDE formulas. Static site
generated with [Astro](https://astro.build), designed for **Cloudflare Pages**.

## Tools

| Route | Tool | Math |
|---|---|---|
| `/elo-calculator` | Elo Change Calculator - single games or a whole mini-tournament | ΔR = K × (S − E), Table 8.1.2, 400-point rule, auto-K (art. 8.3.3), FIDE period rounding (art. 8.3.4) |
| `/expected-score` | Expected Score Calculator - "what are my odds" | FIDE Table 8.1.2 + exact logistic E = 1/(1+10^(ΔR/400)), ladder table + curve chart |
| `/performance-rating` | Tournament Performance Rating | FIDE Ra + dp (Table 8.1.1), rating + score-delta method, linear algorithm-of-400, GM/IM norm benchmarks (Title Regs 1.4) |
| `/rating-planner` | Rating Goal Planner - "how many wins to reach X" | sequential game-by-game simulation with re-reading of K and E |

## Development

```bash
npm install
npm run dev       # http://localhost:4321
npm test          # 26 unit tests on the FIDE math (vitest)
npm run build     # static output in ./dist
npm run preview   # serve the built site locally
```

Everything computes client-side; there is no backend, no tracking, no storage.

## Deploy to Cloudflare Pages

### Option A - Git integration (recommended)

1. Push this folder to a Git repository (GitHub/GitLab).
2. In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
 - **Framework preset:** Astro
 - **Build command:** `npm run build`
 - **Build output directory:** `dist`
 - **Node.js version:** 22 (set env var `NODE_VERSION=22` if the default is older)
4. Add the custom domain `chesselo.top` in the Pages project settings
   (Cloudflare manages the DNS + certificate automatically if the domain's
   zone is on Cloudflare).

### Option B - Direct upload with Wrangler

```bash
npm run build
npx wrangler pages deploy dist --project-name=eloforge
```

### Option C - GitHub Actions

A ready workflow is included at `.github/workflows/deploy.yml`
(needs repository secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`).

`public/_headers` ships security headers and immutable caching for hashed
assets. URLs are served without trailing slashes and match the canonical tags
and `sitemap-index.xml`.

## Sources

The formulas and tables are implemented from, and cited on the site against:

- **F1** - FIDE Rating Regulations (B.02, in force 1 Mar 2024):
  K-factor art. 8.3.3, 400-point rule art. 8.3.1 (as amended 1 Oct 2025),
  rating change & rounding art. 8.3, Tables 8.1.1/8.1.2, initial rating art. 8.2.
  https://handbook.fide.com/chapter/B022024
- **F2** - FIDE Title Regulations (B.01): norm requirements art. 1.4/1.5.
  https://handbook.fide.com/chapter/B012024
- **W1** - "Elo rating system", Wikipedia.
  https://en.wikipedia.org/wiki/Elo_rating_system

## Test vectors (enforced in `tests/fide.test.ts`)

- 2000 vs 2000, win, K=20 → **+10**
- 2400 vs 2000, win, K=10 → **+0.8** (FIDE table reads E = 0.92 at D = 400)
- Expected score 2000 vs 2200 → **0.240**
