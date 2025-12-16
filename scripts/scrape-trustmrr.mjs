/*
  Scraper for TrustMRR listings.
  - Plain Node.js ESM script (no TypeScript runtime loaders)
  - HTML parsing only via jsdom
  - Respects robots.txt best-effort
  - Normalizes MRR values to numeric USD

  Usage:
    TRUSTMRR_URL="https://trustmrr.com/startups" npm run scrape
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const TRUSTMRR_URL = process.env.TRUSTMRR_URL ?? '';

if (!TRUSTMRR_URL) {
  // eslint-disable-next-line no-console
  console.error('TRUSTMRR_URL is required, e.g. TRUSTMRR_URL="https://trustmrr.com/startups" npm run scrape');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'GridMRR-bot/0.1 (static scraper)' },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

function isPathDisallowed(robotsTxt, targetPath) {
  const lines = robotsTxt.split(/\r?\n/).map((l) => l.trim());
  let appliesToUs = false;

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [directiveRaw, valueRaw = ''] = line.split(':', 2).map((p) => p.trim());
    const directive = directiveRaw.toLowerCase();

    if (directive === 'user-agent') {
      const agent = valueRaw.toLowerCase();
      appliesToUs = agent === '*' || agent.includes('gridmrr');
    } else if (appliesToUs && directive === 'disallow') {
      if (!valueRaw) continue;
      if (targetPath.startsWith(valueRaw)) return true;
    }
  }

  return false;
}

async function ensureAllowed(url) {
  const u = new URL(url);
  const robotsUrl = `${u.origin}/robots.txt`;
  try {
    const robots = await fetchText(robotsUrl);
    if (isPathDisallowed(robots, u.pathname)) {
      throw new Error(`Scraping disallowed by robots.txt for path: ${u.pathname}`);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('Warning: could not verify robots.txt:', err.message);
  }
}

function parseMoneyToNumber(value) {
  const cleaned = value.replace(/[\s,]/g, '').replace(/[^0-9.]/g, '');
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num)) return null;
  return num;
}

function parsePercentToNumber(value) {
  const cleaned = value.replace(/[\s,]/g, '').replace('%', '');
  if (!cleaned) return null;
  const num = Number.parseFloat(cleaned);
  if (Number.isNaN(num)) return null;
  return num / 100;
}

function extractCompaniesFromHtml(html, baseUrl) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const rows = Array.from(doc.querySelectorAll('tr[data-slot="table-row"]'));

  const companies = [];

  for (const row of rows) {
    try {
      // Outer link wrapping the whole row, e.g. <a class="contents" href="/startup/supergrow">
      const startupLinkEl = row.querySelector('a.contents');
      const logoEl = row.querySelector('td img');
      const nameEl = row.querySelector('td .font-medium');

      const monoCells = row.querySelectorAll('td.font-mono');
      const mrrText = monoCells[0]?.textContent ?? '';
      const momText = monoCells[1]?.textContent ?? '';

      const name = nameEl?.textContent?.trim() ?? '';
      const mrr = parseMoneyToNumber(mrrText);
      const mom = parsePercentToNumber(momText) ?? 0;

      if (!name || mrr == null) {
        // eslint-disable-next-line no-console
        console.warn('Skipping company with missing name or MRR');
        continue;
      }

      const logoSrc = logoEl?.getAttribute('src') ?? '';
      const logo = logoSrc ? new URL(logoSrc, baseUrl).toString() : '';

      const href = startupLinkEl?.getAttribute('href') ?? '';
      const link = href ? new URL(href, baseUrl).toString() : baseUrl;

      companies.push({
        name,
        logo,
        link,
        mrr,
        mom_growth: mom,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to parse company row:', err.message);
    }
  }

  // Deduplicate conservatively by name + mrr combo
  const byKey = new Map();
  for (const company of companies) {
    const key = `${company.name}::${company.mrr}`;
    if (!byKey.has(key)) {
      byKey.set(key, company);
    }
  }

  return Array.from(byKey.values());
}

async function writeCompaniesJson(records) {
  const outPath = path.resolve(__dirname, '../data/companies.json');
  const json = JSON.stringify(records, null, 2);
  await fs.writeFile(outPath, `${json}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Wrote ${records.length} companies to ${outPath}`);
}

async function main() {
  await ensureAllowed(TRUSTMRR_URL);
  const html = await fetchText(TRUSTMRR_URL);
  const companies = extractCompaniesFromHtml(html, TRUSTMRR_URL);
  await writeCompaniesJson(companies);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

