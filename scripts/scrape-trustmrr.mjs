/*
  Scraper for TrustMRR listings.
  - Plain Node.js ESM script (no TypeScript runtime loaders)
  - HTML parsing only via jsdom
  - Reads from local rawhtml.txt file
  - Normalizes MRR values to numeric USD

  Usage:
    npm run scrape
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base URL for constructing absolute URLs from relative paths
const BASE_URL = 'https://trustmrr.com';

async function readHtmlFile() {
  const htmlPath = path.resolve(__dirname, 'rawhtml.txt');
  try {
    const html = await fs.readFile(htmlPath, 'utf8');
    return html;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`Failed to read ${htmlPath}:`, err.message);
    throw err;
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
  // First, extract all startup hrefs from the raw HTML before parsing
  // This is necessary because JSDOM may restructure invalid HTML where <a> contains <td>
  const startupHrefs = [];
  const rowMatches = html.matchAll(/<tr[^>]*data-slot="table-row"[^>]*>([\s\S]*?)<\/tr>/g);
  for (const match of rowMatches) {
    const rowHtml = match[0];
    // Look for <a class="contents" href="/startup/...">
    const hrefMatch = rowHtml.match(/<a[^>]*class=["']contents["'][^>]*href=["']([^"']+)["']/);
    if (hrefMatch && hrefMatch[1].startsWith('/startup/')) {
      startupHrefs.push(hrefMatch[1]);
    } else {
      // Try alternative pattern
      const altMatch = rowHtml.match(/href=["'](\/startup\/[^"']+)["']/);
      if (altMatch) {
        startupHrefs.push(altMatch[1]);
      } else {
        startupHrefs.push(''); // No link found for this row
      }
    }
  }

  // Wrap HTML fragment in a proper HTML document structure
  // The rawhtml.txt file contains just a <tbody> fragment
  const wrappedHtml = `<html><body><table>${html}</table></body></html>`;
  const dom = new JSDOM(wrappedHtml);
  const doc = dom.window.document;

  const rows = Array.from(doc.querySelectorAll('tr[data-slot="table-row"]'));

  const companies = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const href = startupHrefs[i] || '';
    
    try {
      
      // Get all table cells
      const cells = Array.from(row.querySelectorAll('td'));
      
      // Logo is in the second cell (index 1), which contains the company info
      // It can be either an <img> tag or a gradient div (no logo)
      const companyCell = cells[1];
      const logoEl = companyCell?.querySelector('img');
      const nameEl = companyCell?.querySelector('.font-medium');

      // MRR and MoM are in cells with .font-mono class
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

      // Extract logo URL, handling Next.js image optimization URLs
      let logo = '';
      if (logoEl) {
        let logoSrc = logoEl.getAttribute('src') || logoEl.getAttribute('srcset')?.split(' ')[0] || '';
        
        // Extract actual URL from Next.js image optimization URLs
        // Format: /_next/image?url=https%3A%2F%2F...&w=64&q=75
        if (logoSrc.includes('/_next/image?url=')) {
          try {
            const urlMatch = logoSrc.match(/url=([^&]+)/);
            if (urlMatch) {
              logoSrc = decodeURIComponent(urlMatch[1]);
            }
          } catch {
            // If decoding fails, try to use the src as-is
          }
        }
        
        // Handle both absolute URLs and relative paths
        if (logoSrc) {
          try {
            logo = new URL(logoSrc, baseUrl).toString();
          } catch {
            // If it's already an absolute URL, use it directly
            logo = logoSrc.startsWith('http') ? logoSrc : '';
          }
        }
      }

      // Use the href we extracted from the raw HTML
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
  const html = await readHtmlFile();
  const companies = extractCompaniesFromHtml(html, BASE_URL);
  await writeCompaniesJson(companies);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exitCode = 1;
});

