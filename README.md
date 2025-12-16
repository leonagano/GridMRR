# GridMRR

Static treemap-style visualization of SaaS MRR dominance, backed by a fixed JSON snapshot of TrustMRR-style data.

## Stack

- Next.js (App Router), statically exported
- TypeScript
- Node.js scraping script for TrustMRR-like listings

## Data pipeline

1. Run the scraper (server-side only):

```bash
# Set this to the public listing you want to scrape
export TRUSTMRR_URL="https://example.com/trustmrr-listing"

npm run scrape
```

2. The script:

- Fetches HTML with a GridMRR user agent
- Reads `robots.txt` and aborts if the target path is disallowed
- Parses company rows from the page (you must adjust the CSS selectors in `scripts/scrape-trustmrr.ts` to match the real markup)
- Normalizes:
  - `mrr` → numeric USD value
  - `mom_growth` → decimal percentage (e.g. `0.04` for `+4%`)
- Skips entries with missing MRR
- Writes `data/companies.json` committed in this repo

3. Next.js imports `data/companies.json` at build time and renders the masonry treemap. There is **no client-side data fetching**.

## Development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

This runs `next build` followed by a static export suitable for Vercel or any static host. No environment variables or secrets are required at runtime.

## Legal & attribution

- Not affiliated with TrustMRR
- Not created by Marc Lou — but maybe he wants to buy it?
- Created by Leo (<https://x.com/leonagano>)
