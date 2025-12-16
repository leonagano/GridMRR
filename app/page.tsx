import type React from 'react';
import companies from '../data/companies.json';

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
  return `linear-gradient(145deg, ${darker}, ${lighter})`;
}

function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  });
}

function formatMonthly(mrr: number): string {
  return mrr.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

function formatMRRAbbreviated(mrr: number): string {
  if (mrr >= 1000000) {
    return `$${(mrr / 1000000).toFixed(1)}M`;
  } else if (mrr >= 1000) {
    return `$${(mrr / 1000).toFixed(0)}k`;
  } else {
    return `$${mrr}`;
  }
}

function formatGrowth(growth: number): string {
  const pct = growth * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(1)}% MoM`;
}

function addRefToLink(link: string): string {
  if (link.includes('trustmrr.com')) {
    const separator = link.includes('?') ? '&' : '?';
    return `${link}${separator}ref=gridmrr`;
  }
  return link;
}

interface TreemapNode extends Company {
  x: number;
  y: number;
  width: number;
  height: number;
  columnIndex?: number;
}

// Column-first packing algorithm: fill columns vertically, then move to next column
function buildTreemap(data: Company[], containerWidth: number, containerHeight: number): TreemapNode[] {
  const totalMRR = data.reduce((sum, d) => sum + d.mrr, 0) || 1;
  
  // Calculate areas proportionally to MRR, but ensure minimum area for visibility
  // Use a higher areaScale to make differences more visible
  const areaScale = 0.75;
  const minArea = containerWidth * containerHeight * 0.001; // Minimum 0.1% of total area
  
  const items = [...data]
    .sort((a, b) => b.mrr - a.mrr)
    .map((d) => {
      // Calculate area proportional to MRR
      const proportionalArea = (d.mrr / totalMRR) * containerWidth * containerHeight * areaScale;
      // Ensure minimum area but preserve relative differences
      const area = Math.max(proportionalArea, minArea);
      return { ...d, area };
    });

  const nodes: TreemapNode[] = [];
  
  // Reduced minimum dimensions to allow more visual variation
  const minWidth = containerWidth * 0.03; // 3% of container width (reduced from 6%)
  const minHeight = containerHeight * 0.025; // 2.5% of container height (reduced from 5%)
  
  // Maximum aspect ratio to enforce square-ish shapes (width/height)
  // We want height >= width, so maxAspectRatio should be <= 1.0
  const maxAspectRatio = 0.9; // Blocks should be at most 0.9:1 (width:height), meaning height is always >= width
  
  // Spacing between items (in pixels, will be converted to percentage)
  const gap = 0.5; // 2px small gap between items and columns
  
  // Track columns: each column has an x position, width, current y position, and index
  interface Column {
    x: number;
    width: number;
    currentY: number;
    index: number;
  }
  
  const columns: Column[] = [];
  
  // Helper to find or create a column where an item fits
  // Prioritizes height >= width for square-ish blocks
  function findOrCreateColumn(itemArea: number): { column: Column; itemWidth: number; itemHeight: number } {
    // Calculate ideal square dimensions for this item
    // Start with square root, but prioritize height
    const idealSquareSize = Math.sqrt(itemArea);
    let idealHeight = Math.max(idealSquareSize, minHeight);
    let idealWidth = Math.max(itemArea / idealHeight, minWidth);
    
    // Enforce aspect ratio - ensure height >= width (width/height <= maxAspectRatio)
    let idealAspectRatio = idealWidth / idealHeight;
    if (idealAspectRatio > maxAspectRatio) {
      // Too wide, make it taller to maintain height >= width
      idealHeight = idealWidth / maxAspectRatio;
      idealWidth = Math.max(itemArea / idealHeight, minWidth);
    }
    // If it's already taller than wide, that's fine - we want height >= width
    
    // Try to find an existing column with similar width (within 20% tolerance - stricter for more square)
    const widthTolerance = idealWidth * 0.2;
    
    for (const col of columns) {
      // Check if column width is close to ideal (for square-ish blocks)
      if (Math.abs(col.width - idealWidth) <= widthTolerance) {
        // Calculate height for this column width
        let itemHeight = Math.max(itemArea / col.width, minHeight);
        const itemWidth = col.width;
        
        // Enforce aspect ratio - ensure height >= width
        let colAspectRatio = itemWidth / itemHeight;
        if (colAspectRatio > maxAspectRatio) {
          // Too wide, make it taller
          itemHeight = itemWidth / maxAspectRatio;
        }
        
        const neededHeight = itemHeight + (col.currentY > 0 ? gap : 0);
        
        // Check if item fits vertically
        if (col.currentY + neededHeight <= containerHeight) {
          return { column: col, itemWidth, itemHeight };
        }
      }
    }
    
    // Try any existing column that has space, but only if it maintains square aspect
    for (const col of columns) {
      let itemHeight = Math.max(itemArea / col.width, minHeight);
      const itemWidth = col.width;
      
      // Enforce aspect ratio - ensure height >= width
      let fallbackAspectRatio = itemWidth / itemHeight;
      if (fallbackAspectRatio > maxAspectRatio) {
        itemHeight = itemWidth / maxAspectRatio;
      }
      
      const neededHeight = itemHeight + (col.currentY > 0 ? gap : 0);
      if (col.currentY + neededHeight <= containerHeight) {
        return { column: col, itemWidth, itemHeight };
      }
    }
    
    // No existing column fits, create a new one with ideal width
    // Calculate ideal width based on desired height (prioritize height >= width)
    const idealHeightForNewCol = Math.max(Math.sqrt(itemArea), minHeight);
    let idealWidthForNewCol = Math.max(itemArea / idealHeightForNewCol, minWidth);
    
    // Ensure height >= width
    let newColAspectRatio = idealWidthForNewCol / idealHeightForNewCol;
    if (newColAspectRatio > maxAspectRatio) {
      idealWidthForNewCol = idealHeightForNewCol * maxAspectRatio;
    }
    
    const newX = columns.length > 0 
      ? columns[columns.length - 1].x + columns[columns.length - 1].width + gap - 0.3
      : 0;
    
    // Make sure we don't exceed container width
    let columnWidth = idealWidthForNewCol;
    if (newX + columnWidth > containerWidth) {
      // Use remaining width if we're near the edge
      const remainingWidth = containerWidth - newX;
      if (remainingWidth >= minWidth) {
        columnWidth = remainingWidth;
      } else {
        // No space left, return the last column
        const lastCol = columns[columns.length - 1];
        if (lastCol) {
          let itemHeight = Math.max(itemArea / lastCol.width, minHeight);
          let lastColAspectRatio = lastCol.width / itemHeight;
          if (lastColAspectRatio > maxAspectRatio) {
            itemHeight = lastCol.width / maxAspectRatio;
          }
          return { column: lastCol, itemWidth: lastCol.width, itemHeight };
        }
        // Fallback: create column with minimum width
        columnWidth = minWidth;
      }
    }
    
    const newCol: Column = {
      x: newX,
      width: columnWidth,
      currentY: 0,
      index: columns.length,
    };
    columns.push(newCol);
    
    let itemHeight = Math.max(itemArea / columnWidth, minHeight);
    // Enforce aspect ratio for new column - ensure height >= width
    let finalAspectRatio = columnWidth / itemHeight;
    if (finalAspectRatio > maxAspectRatio) {
      itemHeight = columnWidth / maxAspectRatio;
    }
    
    return { column: newCol, itemWidth: columnWidth, itemHeight };
  }
  
  // Place each item
  for (const item of items) {
    const { column: col, itemWidth, itemHeight } = findOrCreateColumn(item.area);
    
    // Add gap if not first item in column
    const yOffset = col.currentY > 0 ? gap : 0;
    
    // Create node
    nodes.push({
      ...item,
      x: (col.x / containerWidth) * 100,
      y: ((col.currentY + yOffset) / containerHeight) * 100,
      width: (itemWidth / containerWidth) * 100,
      height: (itemHeight / containerHeight) * 100,
      columnIndex: col.index,
    });
    
    // Update column's current Y position (include gap for next item)
    col.currentY += itemHeight + yOffset;
  }

  return nodes;
}

const data = (companies as Company[]).sort((a, b) => b.mrr - a.mrr);

// Use viewport-relative dimensions for the treemap container
const TREEMAP_WIDTH = 100; // percentage
const TREEMAP_HEIGHT = 100; // percentage
const treemapNodes = buildTreemap(data, TREEMAP_WIDTH, TREEMAP_HEIGHT);

export default function Page() {
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <div>
            <div className="site-title">GridMRR</div>
            <div className="site-nav">
              <a href="/stacked-rows" className="site-nav-link">Stacked Rows</a>
              <a href="/pixel-map" className="site-nav-link">Pixel Map</a>
              <a href="/vertical" className="site-nav-link">Vertical</a>
            </div>
            <div className="site-subtitle">
              Data taken from{' '}
              <a href="https://trustmrr.com?ref=gridmrr" target="_blank" rel="noreferrer">
                TrustMRR
              </a>
              . GridMRR is not affiliated with, endorsed by, or partnered with TrustMRR. Created by{' '}
              <a href="https://x.com/leonagano" target="_blank" rel="noreferrer">
                Leo
              </a>
              . Approved by{' '}
              <a href="https://x.com/marclou" target="_blank" rel="noreferrer">
                Marc
              </a>
              ?
            </div>
          </div>
        </div>
      </header>

      <main className="app-shell">
        <section className="app-main">
          <div className="treemap-root">
            <div className="treemap-grid">
              {(() => {
                // Find the maximum column index to determine last 4 columns
                const maxColumnIndex = Math.max(...treemapNodes.map(n => n.columnIndex ?? 0));
                const last4ColumnsStart = Math.max(0, maxColumnIndex - 3); // Last 4 columns
                
                return treemapNodes.map((node, index) => {
                  const bg = pickGradient(index);
                  const style: React.CSSProperties = {
                    position: 'absolute',
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                    width: `${node.width}%`,
                    height: `${node.height}%`,
                    background: bg,
                  };

                  const columnIndex = node.columnIndex ?? 0;
                  const isColumn3OrLater = columnIndex >= 2; // 0-indexed, so 2 = 3rd column
                  const isLast4Columns = columnIndex >= last4ColumnsStart;
                  
                  return (
                    <a
                      key={node.name}
                      href={addRefToLink(node.link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`treemap-card ${isColumn3OrLater ? 'treemap-card-compact' : ''} ${isLast4Columns ? 'treemap-card-minimal' : ''}`}
                      style={style}
                      title={`${node.name} — ${formatMonthly(node.mrr)} / mo`}
                    >
                      <div className="treemap-card-inner">
                        <div className="treemap-card-header">
                          {node.logo && (
                            <div className="treemap-logo-wrapper">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={node.logo} alt={node.name} className="treemap-logo" />
                            </div>
                          )}
                          {!isLast4Columns && <div className="treemap-mrr">{formatMRRAbbreviated(node.mrr)}</div>}
                        </div>
                        {!isColumn3OrLater && <div className="treemap-name">{node.name}</div>}
                      </div>
                    </a>
                  );
                });
              })()}
            </div>
          </div>
        </section>
      </main>

    </>
  );
}
