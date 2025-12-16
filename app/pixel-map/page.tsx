'use client';

import React, { useEffect, useMemo, useState } from 'react';
import companies from '../../data/companies.json';

interface Company {
  name: string;
  logo: string;
  link: string;
  mrr: number;
  mom_growth: number;
}

interface CompanyPixelMeta {
  index: number;
  name: string;
  mrr: number;
  link: string;
  color: string;
  start: number;
  count: number;
}

interface PixelGridState {
  cols: number;
  rows: number;
  pixels: Uint16Array;
  companies: CompanyPixelMeta[];
  dollarsPerPixel: number;
}

const pastelPalette = [
  '#93c5fd',
  '#fca5a5',
  '#d8b4fe',
  '#facc15',
  '#86efac',
  '#f9a8d4',
  '#fdba74',
  '#818cf8',
  '#7dd3fc',
  '#a855f7',
  '#a3e635',
  '#fde68a',
  '#fb7185',
  '#bae6fd',
  '#e5b3fe',
  '#f97373',
  '#34d399',
];

function shadeColor(hex: string, percent: number) {
  const cleaned = hex.replace('#', '');
  const num = parseInt(cleaned.length === 3 ? cleaned.repeat(2) : cleaned, 16);
  let r = (num >> 16) & 0xff;
  let g = (num >> 8) & 0xff;
  let b = num & 0xff;

  const t = percent < 0 ? 0 : 255;
  const p = Math.abs(percent) / 100;

  r = Math.round((t - r) * p + r);
  g = Math.round((t - g) * p + g);
  b = Math.round((t - b) * p + b);

  const toHex = (v: number) => v.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function pickColor(index: number) {
  const base = pastelPalette[index % pastelPalette.length];
  return `linear-gradient(145deg, ${shadeColor(base, -3)}, ${shadeColor(base, 35)})`;
}

function addRefToLink(link: string): string {
  if (link.includes('trustmrr.com')) {
    const separator = link.includes('?') ? '&' : '?';
    return `${link}${separator}ref=gridmrr`;
  }
  return link;
}

const data = (companies as Company[]).sort((a, b) => b.mrr - a.mrr);

const LABEL_PIXEL_THRESHOLD = 80; // show inline label only for large blocks
const MIN_PIXEL_SIZE = 6; // logical minimum size in CSS px
const MAX_PIXELS = 9000; // safety cap to avoid DOM overload

function buildPixelGrid(viewportWidth: number, viewportHeight: number): PixelGridState {
  // Reserve some space for header
  const headerReserve = 96;
  const usableHeight = Math.max(viewportHeight - headerReserve, MIN_PIXEL_SIZE * 4);

  let cols = Math.floor(viewportWidth / MIN_PIXEL_SIZE);
  let rows = Math.floor(usableHeight / MIN_PIXEL_SIZE);

  cols = Math.max(20, cols);
  rows = Math.max(10, rows);

  let totalPixels = cols * rows;
  if (totalPixels > MAX_PIXELS) {
    const scale = Math.sqrt(MAX_PIXELS / totalPixels);
    cols = Math.max(10, Math.floor(cols * scale));
    rows = Math.max(10, Math.floor(rows * scale));
    totalPixels = cols * rows;
  }

  const totalMRR = data.reduce((sum, d) => sum + Math.max(d.mrr, 0), 0) || 1;
  const dollarsPerPixel = totalMRR / totalPixels;

  // Compute ideal pixel counts per company
  const rawCounts = data.map((c) => Math.max(0, c.mrr) / dollarsPerPixel);
  const floorCounts = rawCounts.map((v) => Math.floor(v));
  let assigned = floorCounts.reduce((s, v) => s + v, 0);
  let remaining = totalPixels - assigned;

  const remainders = rawCounts.map((v, i) => ({ i, r: v - floorCounts[i] }));
  remainders.sort((a, b) => b.r - a.r);
  for (let k = 0; k < remainders.length && remaining > 0; k += 1) {
    floorCounts[remainders[k].i] += 1;
    remaining -= 1;
  }

  const pixels = new Uint16Array(totalPixels);
  const metas: CompanyPixelMeta[] = [];

  let cursor = 0;
  data.forEach((c, idx) => {
    const count = floorCounts[idx];
    if (count <= 0) return;
    const start = cursor;
    const end = Math.min(totalPixels, start + count);
    for (let p = start; p < end; p += 1) {
      pixels[p] = idx;
    }
    const color = pickColor(idx);
    metas.push({
      index: idx,
      name: c.name,
      mrr: c.mrr,
      link: c.link,
      color,
      start,
      count: end - start,
    });
    cursor = end;
  });

  // Fill any remaining pixels with the last company to avoid gaps
  if (cursor < totalPixels && metas.length > 0) {
    const last = metas[metas.length - 1];
    for (let p = cursor; p < totalPixels; p += 1) {
      pixels[p] = last.index;
    }
    last.count += totalPixels - cursor;
  }

  return { cols, rows, pixels, companies: metas, dollarsPerPixel };
}

export default function PixelMapPage() {
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    function handleResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const grid = useMemo(() => {
    if (!viewport) return null;
    return buildPixelGrid(viewport.width, viewport.height);
  }, [viewport]);

  if (!grid) {
    return null;
  }

  const { cols, rows, pixels, companies, dollarsPerPixel } = grid;

  const companyMetaByIndex: Record<number, CompanyPixelMeta> = {};
  for (const meta of companies) {
    companyMetaByIndex[meta.index] = meta;
  }

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div>
            <div className="site-title">GridMRR</div>
            <div className="site-nav">
              <a href="/" className="site-nav-link">
                Treemap
              </a>
              <a href="/stacked-rows" className="site-nav-link">
                Stacked Rows
              </a>
            </div>
            <div className="site-subtitle">Pixel Map — 1 pixel ≈ ${dollarsPerPixel.toFixed(0)} MRR</div>
          </div>
        </div>
      </header>

      <main className="app-shell">
        <section className="app-main">
          <div
            className="pixel-map-container"
            style={{
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {Array.from({ length: pixels.length }).map((_, idx) => {
              const companyIndex = pixels[idx];
              const meta = companyMetaByIndex[companyIndex];
              const showLabel = meta.count >= LABEL_PIXEL_THRESHOLD && idx === meta.start;

              return (
                // eslint-disable-next-line jsx-a11y/anchor-is-valid
                <a
                  key={idx}
                  href={addRefToLink(meta.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pixel-cell"
                  style={{ background: meta.color }}
                  title={`${meta.name} — $${meta.mrr.toLocaleString('en-US', {
                    maximumFractionDigits: 0,
                  })} / mo`}
                >
                  {showLabel && (
                    <span className="pixel-cell-label">
                      {meta.name}{' '}
                      {meta.mrr >= 1000
                        ? `$${Math.round(meta.mrr / 1000)}k`
                        : `$${meta.mrr.toFixed(0)}`}
                    </span>
                  )}
                </a>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}


