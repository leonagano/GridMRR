'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import companies from '../../data/companies.json';

interface Company {
  name: string;
  logo: string;
  link: string;
  mrr: number;
  mom_growth: number;
}

const pastelPalette = [
  '#93c5fd', // brighter sky
  '#fca5a5', // brighter rose
  '#d8b4fe', // brighter violet
  '#facc15', // brighter amber
  '#86efac', // brighter mint
  '#f9a8d4', // brighter pink
  '#fdba74', // brighter orange
  '#818cf8', // brighter indigo
  '#7dd3fc', // brighter light blue
  '#a855f7', // brighter lavender/purple
  '#a3e635', // brighter lime
  '#fde68a', // bright soft yellow
  '#fb7185', // bright blush
  '#bae6fd', // clear pale sky
  '#e5b3fe', // pastel purple
  '#f97373', // coral
  '#34d399', // bright green
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

function pickGradient(index: number) {
  const base = pastelPalette[index % pastelPalette.length];
  const darker = shadeColor(base, -3);
  const lighter = shadeColor(base, 40);
  return `linear-gradient(180deg, ${darker}, ${lighter})`;
}

function formatMRR(mrr: number): string {
  return mrr.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function addRefToLink(link: string): string {
  if (link.includes('trustmrr.com')) {
    const separator = link.includes('?') ? '&' : '?';
    return `${link}${separator}ref=gridmrr`;
  }
  return link;
}

const data = (companies as Company[]).sort((a, b) => b.mrr - a.mrr);
const maxMRR = Math.max(...data.map(d => d.mrr));

export default function VerticalPage() {
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      setViewportHeight(window.innerHeight - 140); // Account for header
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div>
            <div className="site-title">GridMRR</div>
            <div className="site-nav">
              <a href="/" className="site-nav-link">Treemap</a>
              <a href="/stacked-rows" className="site-nav-link">Stacked Rows</a>
              <a href="/pixel-map" className="site-nav-link">Pixel Map</a>
            </div>
            <div className="site-subtitle">
              Vertical Bars Visualization
            </div>
          </div>
        </div>
      </header>

      <main className="app-shell">
        <section className="app-main">
          <div className="vertical-bars-container">
            {data.map((company, index) => {
              // Calculate height as percentage of max MRR
              // Use square root scaling to make differences more visible in lower ranges
              const normalizedMRR = company.mrr / maxMRR;
              const scaledMRR = Math.pow(normalizedMRR, 0.25); // 1/4 power for better visibility
              const heightPercent = scaledMRR * 100;
              
              // Get colorful gradient background
              const bg = pickGradient(index);
              
              const isZeroMRR = company.mrr === 0;
              
              return (
                <a
                  key={company.name}
                  href={addRefToLink(company.link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="vertical-bar"
                  style={{
                    height: viewportHeight > 0 ? `${heightPercent}%` : '0%',
                    background: bg,
                  }}
                  title={`${company.name} — ${formatMRR(company.mrr)} / mo`}
                >
                  <div className="vertical-bar-content">
                    {company.logo && (
                      <div className="vertical-bar-logo">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={company.logo} alt={company.name} />
                      </div>
                    )}
                    <div className="vertical-bar-name">{company.name}</div>
                    {!isZeroMRR && (
                      <div className="vertical-bar-mrr">{formatMRR(company.mrr)}</div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      </main>
    </>
  );
}

