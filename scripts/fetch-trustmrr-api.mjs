/*
  Fetcher for TrustMRR listings via API.
  - Plain Node.js ESM script (no TypeScript runtime loaders)
  - Fetches data from TrustMRR API endpoint
  - Transforms API response to match Company interface
  - Writes to data/companies.json

  Usage:
    node scripts/fetch-trustmrr-api.mjs
*/

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// API configuration
const API_URL = 'https://trustmrr.com/api/search';
const BASE_URL = 'https://trustmrr.com';
const LIMIT = 100; // Fetch more per page for efficiency

/**
 * Fetches a single page of startups from the API
 */
async function fetchStartupsPage(page = 1, limit = LIMIT) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page,
      limit,
      sortBy: 'revenue',
    }),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Fetches all startups from the API by paginating through all pages
 */
async function fetchAllStartups() {
  // Fetch first page to get pagination info
  const firstPage = await fetchStartupsPage(1, LIMIT);
  const totalPages = firstPage.pagination?.pages || 1;
  
  // eslint-disable-next-line no-console
  console.log(`Found ${firstPage.pagination?.total || 0} startups across ${totalPages} pages`);

  const allStartups = [...firstPage.startups];

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    // eslint-disable-next-line no-console
    console.log(`Fetching page ${page}/${totalPages}...`);
    const pageData = await fetchStartupsPage(page, LIMIT);
    allStartups.push(...pageData.startups);
    
    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return allStartups;
}

/**
 * Transforms API startup object to Company interface format
 */
function transformStartup(startup) {
  return {
    name: startup.name || '',
    logo: startup.icon || '',
    link: `${BASE_URL}/startup/${startup.slug}`,
    mrr: startup.currentMrr || 0,
    mom_growth: (startup.growth30d || 0) / 100, // Convert percentage to decimal
  };
}

/**
 * Writes companies to JSON file
 */
async function writeCompaniesJson(companies) {
  const outPath = path.resolve(__dirname, '../data/companies.json');
  const json = JSON.stringify(companies, null, 2);
  await fs.writeFile(outPath, `${json}\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`\nWrote ${companies.length} companies to ${outPath}`);
}

/**
 * Main function
 */
async function main() {
  try {
    // eslint-disable-next-line no-console
    console.log('Fetching startups from TrustMRR API...\n');
    
    const startups = await fetchAllStartups();
    
    // Transform to Company format
    const companies = startups
      .map(transformStartup)
      .filter((company) => company.name && company.mrr > 0); // Filter out invalid entries
    
    // Sort by MRR descending
    companies.sort((a, b) => b.mrr - a.mrr);
    
    // Deduplicate by name + mrr combo
    const byKey = new Map();
    for (const company of companies) {
      const key = `${company.name}::${company.mrr}`;
      if (!byKey.has(key)) {
        byKey.set(key, company);
      }
    }
    
    const uniqueCompanies = Array.from(byKey.values());
    
    await writeCompaniesJson(uniqueCompanies);
    
    // eslint-disable-next-line no-console
    console.log(`\n✓ Successfully fetched and saved ${uniqueCompanies.length} companies`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Error:', err.message);
    process.exitCode = 1;
  }
}

main();

