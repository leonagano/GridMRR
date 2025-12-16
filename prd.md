GridMRR — Product Requirements Document

1. Purpose

GridMRR visualizes the relative dominance of SaaS companies by Monthly Recurring Revenue (MRR) using a treemap-style layout. Data is sourced from TrustMRR and transformed into a static, explorable revenue map.

The product prioritizes clarity, proportionality, and zero-friction consumption. No accounts. No interaction debt.

⸻

2. Scope

In Scope
	•	Scrape TrustMRR public data
	•	Extract company name, logo, MRR, and MoM growth
	•	Normalize and store data in a fixed JSON file
	•	Render a proportional MRR treemap
	•	Deploy as a static site on Vercel

Out of Scope
	•	User accounts or authentication
	•	Editing or crowdsourced submissions
	•	Real-time updates
	•	Monetization

⸻

3. Data Requirements

Source
	•	GridMRR public company listings

Fields

Each company object must contain:

{
  "name": "string",
  "logo": "string (url)",
  "link": "string (url),
  "mrr": "number",
  "mom_growth": "number"
}

Storage
	•	Single fixed JSON file
	•	Committed to repository
	•	Regenerated manually or via script

Example file path:

/data/companies.json


⸻

4. Scraping Requirements

Method
	•	Server-side script (Node.js)
	•	HTML parsing only
	•	No authentication
	•	Respect robots.txt

Output
	•	Normalize MRR values to numeric USD
	•	Normalize MoM growth to percentage
	•	Download or hotlink logos

Failure Handling
	•	Skip entries with missing MRR
	•	Log failures without breaking build

⸻

5. Visualization

Layout
	•	Treemap where area = MRR
	•	Largest companies dominate visual space
	•	Smaller companies remain visible but subordinate

Color
	•	Neutral pastel palette
	•	No semantic color encoding

Labels
	•	Company name
	•	MRR (formatted)
	•	MoM growth (formatted)

Interaction
	•	Hover only
	•	No clicks required

⸻

6. Frontend

Stack
	•	Next.js
	•	Static generation
	•	Client-side treemap rendering

Performance
	•	Single page
	•	No client-side data fetching
	•	Lighthouse score ≥ 90

⸻

7. Deployment

Platform
	•	Vercel

Build
	•	npm run build
	•	Static export

Environment
	•	No secrets
	•	No environment variables

⸻

8. Legal & Attribution

Footer Copy

Not affiliated with TrustMRR (link).
Not created by Marc Lou — but maybe he wants to buy it?
Created by Leo (https://x.com/leonagano)

Positioning
	•	Informational visualization only
	•	No implied endorsement

⸻

9. Success Criteria
	•	Data renders correctly from JSON
	•	Visual clearly reflects revenue dominance
	•	Zero runtime errors
	•	Deploy completes without manual intervention

⸻

10. Constraints
	•	Static-only architecture
	•	Manual refresh cadence
	•	Single data source dependency

⸻

11. Non-Goals
	•	Accuracy guarantees
	•	Financial advice
	•	Competitive analysis tools

⸻

End of document.