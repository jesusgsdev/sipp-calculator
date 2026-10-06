/**
 * Responsive SVG Charting Engine for UK Pension Calculator
 * Zero external dependencies, accessible, high-DPI crisp rendering
 * Supports:
 * - Full lifetime projections until Age 100
 * - Pot drawdown trajectory (Nominal vs Today's Money)
 * - State Pension triple-lock growth trajectory over the years (dual-axis)
 */

function formatGBP(value, decimals = 0) {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(value);
}

/**
 * Render Full Lifetime Timeline Chart (Age currentAge -> Age 100)
 * Visualizes:
 * - Accumulation phase (Contributions + Growth)
 * - 25% Tax-Free Lump Sum drawdown step
 * - Decumulation / Drawdown phase up to Age 100
 * - Public State Pension Triple-Lock Growth curve over time (dual axis)
 * - Pot longevity & depletion point if applicable
 */
export function renderGrowthChart(containerEl, timeline, currentAge, retirementAge, potDepletedAge = null) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  if (!timeline || timeline.length === 0) {
    containerEl.innerHTML = '<div class="chart-empty">No projection data to display</div>';
    return;
  }

  const width = 880;
  const height = 410;
  const margin = { top: 38, right: 68, bottom: 50, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Find max pot value across pre-lump-sum, nominal, real, and contributions for scale
  const maxPot = Math.max(
    ...timeline.map(d => Math.max(
      d.potBeforeLumpSumNominal || 0,
      d.closingPotNominal || 0,
      d.closingPotReal || 0,
      (d.cumulativeEmployeeNominal || 0) + (d.cumulativeEmployerNominal || 0) + (d.cumulativeSippGrossNominal || 0)
    ))
  );
  const yMax = maxPot > 0 ? maxPot * 1.12 : 100000;

  // Find max state pension for right-hand Y-axis scale
  const maxSp = Math.max(...timeline.map(d => d.statePensionNominal || 0)) * 1.2 || 50000;

  // Scales
  const xScale = (i) => margin.left + (i / (timeline.length - 1 || 1)) * innerWidth;
  const yScale = (v) => margin.top + innerHeight - (Math.max(0, v) / yMax) * innerHeight;
  const spYScale = (v) => margin.top + innerHeight - (Math.max(0, v) / maxSp) * innerHeight;

  // Find index of retirement age
  const retireIndex = timeline.findIndex(d => d.age === retirementAge);
  const retireX = retireIndex >= 0 ? xScale(retireIndex) : null;

  // Create SVG
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'pension-chart-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Pension pot growth, drawdown trajectory, and State Pension triple-lock growth to age 100');

  // Definitions for gradients & markers
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="nominalGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0284c7" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0.02"/>
    </linearGradient>
    <linearGradient id="realGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0.02"/>
    </linearGradient>
    <linearGradient id="contribGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.01"/>
    </linearGradient>
    <linearGradient id="spGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.01"/>
    </linearGradient>
  `;
  svg.appendChild(defs);

  // Background shading for Drawdown Phase (retirementAge -> 100)
  if (retireX !== null && retireX < width - margin.right) {
    const drawdownBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    drawdownBg.setAttribute('x', retireX);
    drawdownBg.setAttribute('y', margin.top);
    drawdownBg.setAttribute('width', (width - margin.right) - retireX);
    drawdownBg.setAttribute('height', innerHeight);
    drawdownBg.setAttribute('fill', '#f8fafc');
    svg.appendChild(drawdownBg);

    // Phase Labels at top
    const accumLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    accumLabel.setAttribute('x', margin.left + (retireX - margin.left) / 2);
    accumLabel.setAttribute('y', margin.top - 12);
    accumLabel.setAttribute('text-anchor', 'middle');
    accumLabel.setAttribute('class', 'phase-header-label');
    accumLabel.textContent = 'ACCUMULATION PHASE (SAVING)';
    svg.appendChild(accumLabel);

    const drawdownLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    drawdownLabel.setAttribute('x', retireX + ((width - margin.right) - retireX) / 2);
    drawdownLabel.setAttribute('y', margin.top - 12);
    drawdownLabel.setAttribute('text-anchor', 'middle');
    drawdownLabel.setAttribute('class', 'phase-header-label retirement');
    drawdownLabel.textContent = 'DECUMULATION / DRAWDOWN PHASE (AGE 100)';
    svg.appendChild(drawdownLabel);
  }

  // Left Y-axis (Pot £) gridlines & ticks
  const yTicksCount = 5;
  const yTicksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  yTicksGroup.setAttribute('class', 'grid-lines');

  for (let i = 0; i <= yTicksCount; i++) {
    const val = (yMax / yTicksCount) * i;
    const y = yScale(val);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', margin.left);
    line.setAttribute('x2', width - margin.right);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#e2e8f0');
    line.setAttribute('stroke-dasharray', i === 0 ? '0' : '3 3');
    yTicksGroup.appendChild(line);

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', margin.left - 10);
    text.setAttribute('y', y + 4);
    text.setAttribute('text-anchor', 'end');
    text.setAttribute('class', 'axis-label');
    text.textContent = val >= 1000000 ? `£${(val / 1000000).toFixed(2)}m` : `£${Math.round(val / 1000)}k`;
    yTicksGroup.appendChild(text);
  }
  svg.appendChild(yTicksGroup);

  // Right Y-axis (State Pension £/yr) ticks
  const spTicksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  spTicksGroup.setAttribute('class', 'sp-axis-ticks');

  for (let i = 0; i <= 4; i++) {
    const spVal = (maxSp / 4) * i;
    const spY = spYScale(spVal);

    const spText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    spText.setAttribute('x', width - margin.right + 10);
    spText.setAttribute('y', spY + 4);
    spText.setAttribute('text-anchor', 'start');
    spText.setAttribute('class', 'axis-label sp-label');
    spText.textContent = `£${Math.round(spVal / 1000)}k/yr`;
    spTicksGroup.appendChild(spText);
  }
  // Right Axis Label
  const rightAxisTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  rightAxisTitle.setAttribute('x', width - margin.right + 10);
  rightAxisTitle.setAttribute('y', margin.top - 12);
  rightAxisTitle.setAttribute('class', 'axis-label sp-title');
  rightAxisTitle.textContent = 'State Pension →';
  spTicksGroup.appendChild(rightAxisTitle);
  svg.appendChild(spTicksGroup);

  // X-axis ticks
  const xTicksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const keyAges = [currentAge, retirementAge, 75, 85, 95, 100].filter((v, idx, arr) => arr.indexOf(v) === idx && v <= 100);

  timeline.forEach((pt, i) => {
    if (keyAges.includes(pt.age)) {
      const x = xScale(i);
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', height - margin.bottom + 22);
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', `axis-label ${pt.age === retirementAge || pt.age === 100 ? 'bold' : ''}`);
      text.textContent = pt.age === retirementAge ? `Age ${pt.age} (Retire)` : `Age ${pt.age}`;
      xTicksGroup.appendChild(text);
    }
  });
  svg.appendChild(xTicksGroup);

  // Path Builders
  const buildLine = (getter) => {
    return timeline.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(getter(pt))}`).join(' ');
  };

  const buildArea = (getter) => {
    let d = `M ${xScale(0)} ${yScale(0)}`;
    timeline.forEach((pt, i) => {
      d += ` L ${xScale(i)} ${yScale(getter(pt))}`;
    });
    d += ` L ${xScale(timeline.length - 1)} ${yScale(0)} Z`;
    return d;
  };

  // 1. Total Cumulative Contributions Line (workplace + SIPP) up to retirement
  const accumPoints = timeline.filter(d => d.age <= retirementAge);
  if (accumPoints.length > 0) {
    const contribPath = accumPoints.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(pt.cumulativeEmployeeNominal + pt.cumulativeEmployerNominal + (pt.cumulativeSippGrossNominal || 0))}`).join(' ');
    const contribLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    contribLine.setAttribute('d', contribPath);
    contribLine.setAttribute('fill', 'none');
    contribLine.setAttribute('stroke', '#f59e0b');
    contribLine.setAttribute('stroke-width', '2');
    contribLine.setAttribute('stroke-dasharray', '4 4');
    svg.appendChild(contribLine);
  }

  // 2. Real Pot (Today's Money) Area & Line all the way to age 100
  const realArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  realArea.setAttribute('d', buildArea(d => d.closingPotReal));
  realArea.setAttribute('fill', 'url(#realGrad)');
  svg.appendChild(realArea);

  const realLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  realLine.setAttribute('d', buildLine(d => d.closingPotReal));
  realLine.setAttribute('fill', 'none');
  realLine.setAttribute('stroke', '#10b981');
  realLine.setAttribute('stroke-width', '2.5');
  svg.appendChild(realLine);

  // 3. Nominal Pot Area & Line all the way to age 100
  const nominalArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  nominalArea.setAttribute('d', buildArea(d => d.closingPotNominal));
  nominalArea.setAttribute('fill', 'url(#nominalGrad)');
  svg.appendChild(nominalArea);

  const nominalLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  nominalLine.setAttribute('d', buildLine(d => d.closingPotNominal));
  nominalLine.setAttribute('fill', 'none');
  nominalLine.setAttribute('stroke', '#0284c7');
  nominalLine.setAttribute('stroke-width', '3');
  svg.appendChild(nominalLine);

  // 4. Public State Pension Triple-Lock Growth Curve across all years
  const spLinePath = timeline.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${spYScale(pt.statePensionNominal || 0)}`).join(' ');
  const spLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  spLine.setAttribute('d', spLinePath);
  spLine.setAttribute('fill', 'none');
  spLine.setAttribute('stroke', '#8b5cf6');
  spLine.setAttribute('stroke-width', '2.5');
  spLine.setAttribute('stroke-dasharray', '6 3');
  svg.appendChild(spLine);

  // Vertical Marker at Retirement Age
  if (retireX !== null) {
    const retireLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    retireLine.setAttribute('x1', retireX);
    retireLine.setAttribute('x2', retireX);
    retireLine.setAttribute('y1', margin.top);
    retireLine.setAttribute('y2', height - margin.bottom);
    retireLine.setAttribute('stroke', '#0369a1');
    retireLine.setAttribute('stroke-width', '2');
    retireLine.setAttribute('stroke-dasharray', '5 4');
    svg.appendChild(retireLine);

    const retirePoint = timeline[retireIndex];
    if (retirePoint) {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', retireX);
      circle.setAttribute('cy', yScale(retirePoint.closingPotNominal));
      circle.setAttribute('r', '5.5');
      circle.setAttribute('fill', '#0369a1');
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');
      svg.appendChild(circle);

      const flagText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      flagText.setAttribute('x', retireX + 6);
      flagText.setAttribute('y', margin.top + 16);
      flagText.setAttribute('class', 'chart-retire-tag');
      flagText.textContent = `Retirement (Age ${retirementAge})`;
      svg.appendChild(flagText);
    }
  }

  // Depletion Indicator Marker
  if (potDepletedAge && potDepletedAge <= 100) {
    const depletedIndex = timeline.findIndex(d => d.age === potDepletedAge);
    if (depletedIndex >= 0) {
      const depX = xScale(depletedIndex);
      const depY = yScale(0);

      const depCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      depCircle.setAttribute('cx', depX);
      depCircle.setAttribute('cy', depY);
      depCircle.setAttribute('r', '6');
      depCircle.setAttribute('fill', '#ef4444');
      depCircle.setAttribute('stroke', '#ffffff');
      depCircle.setAttribute('stroke-width', '2');
      svg.appendChild(depCircle);

      const depTag = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      depTag.setAttribute('x', depX);
      depTag.setAttribute('y', depY - 10);
      depTag.setAttribute('text-anchor', 'middle');
      depTag.setAttribute('class', 'chart-depleted-tag');
      depTag.textContent = `Pot Depleted (Age ${potDepletedAge})`;
      svg.appendChild(depTag);
    }
  }

  // Interactive Hover Crosshair & Dots
  const tooltipLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  tooltipLine.setAttribute('class', 'chart-hover-line');
  tooltipLine.setAttribute('y1', margin.top);
  tooltipLine.setAttribute('y2', height - margin.bottom);
  tooltipLine.style.display = 'none';
  svg.appendChild(tooltipLine);

  const hoverDotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hoverDotsGroup.style.display = 'none';
  const dotNominal = createDot('#0284c7');
  const dotReal = createDot('#10b981');
  const dotContrib = createDot('#f59e0b');
  const dotSP = createDot('#8b5cf6');
  hoverDotsGroup.append(dotNominal, dotReal, dotContrib, dotSP);
  svg.appendChild(hoverDotsGroup);

  // Tooltip DOM Element
  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.display = 'none';
  containerEl.appendChild(tooltip);

  // Hover Overlay Rect
  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  overlay.setAttribute('x', margin.left);
  overlay.setAttribute('y', margin.top);
  overlay.setAttribute('width', innerWidth);
  overlay.setAttribute('height', innerHeight);
  overlay.setAttribute('fill', 'transparent');
  overlay.style.cursor = 'crosshair';

  overlay.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (margin.left * rect.width / width)) / (innerWidth * rect.width / width)));
    const index = Math.round(ratio * (timeline.length - 1));
    const pt = timeline[index];
    if (!pt) return;

    const xPos = xScale(index);
    tooltipLine.setAttribute('x1', xPos);
    tooltipLine.setAttribute('x2', xPos);
    tooltipLine.style.display = 'block';

    const yNom = yScale(pt.closingPotNominal);
    const yReal = yScale(pt.closingPotReal);
    const ySP = spYScale(pt.statePensionNominal || 0);

    dotNominal.setAttribute('cx', xPos);
    dotNominal.setAttribute('cy', yNom);
    dotReal.setAttribute('cx', xPos);
    dotReal.setAttribute('cy', yReal);
    dotSP.setAttribute('cx', xPos);
    dotSP.setAttribute('cy', ySP);

    const isRetirement = pt.phase === 'retirement' || (pt.age >= retirementAge);

    if (!isRetirement) {
      dotContrib.style.display = 'block';
      const yCon = yScale(pt.cumulativeEmployeeNominal + pt.cumulativeEmployerNominal + (pt.cumulativeSippGrossNominal || 0));
      dotContrib.setAttribute('cx', xPos);
      dotContrib.setAttribute('cy', yCon);
    } else {
      dotContrib.style.display = 'none';
    }
    hoverDotsGroup.style.display = 'block';

    let phaseBadge = isRetirement
      ? `<span class="badge-phase retirement">Retirement Drawdown</span>`
      : `<span class="badge-phase accumulation">Accumulation Phase</span>`;

    let content = `
      <div class="tooltip-header">
        <span>Age ${pt.age} (${pt.year} yrs from now)</span>
        ${phaseBadge}
      </div>
      <div class="tooltip-row"><span class="badge-dot" style="background:#0284c7"></span> Pot Balance (Nominal): <strong>${formatGBP(pt.closingPotNominal)}</strong></div>
      <div class="tooltip-row"><span class="badge-dot" style="background:#10b981"></span> Pot in Today's Money: <strong>${formatGBP(pt.closingPotReal)}</strong></div>
      <div class="tooltip-row"><span class="badge-dot" style="background:#8b5cf6"></span> State Pension (Triple-Lock): <strong>${formatGBP(pt.statePensionNominal)}/yr</strong> (${formatGBP(pt.statePensionNominal/12)}/mo)</div>
    `;

    if (isRetirement) {
      if (pt.isPotDepleted) {
        content += `<div class="tooltip-row text-red"><strong>⚠️ Pot Depleted (£0 remaining)</strong></div>`;
      } else {
        content += `
          <div class="tooltip-row"><span class="badge-dot" style="background:#ea580c"></span> Pot Drawdown: <strong>${formatGBP(pt.potDrawdownReal)} / yr</strong> (real)</div>
          <div class="tooltip-row small-muted">Total Capital Drawn to Date: ${formatGBP(pt.cumulativeWithdrawalsReal)} (Today's £)</div>
        `;
      }
    } else {
      content += `
        <div class="tooltip-row"><span class="badge-dot" style="background:#f59e0b"></span> Cumulative Contribs: <strong>${formatGBP(pt.cumulativeEmployeeNominal + pt.cumulativeEmployerNominal + (pt.cumulativeSippGrossNominal || 0))}</strong></div>
        ${pt.sippGrossContrib > 0 ? `<div class="tooltip-row small-muted">Includes SIPP: ${formatGBP(pt.sippNetContrib)} net + ${formatGBP(pt.sippHmrcRelief)} HMRC relief</div>` : ''}
      `;
    }

    tooltip.innerHTML = content;
    tooltip.style.display = 'block';

    const leftPx = (xPos / width) * rect.width;
    const topPx = (Math.min(yNom, yReal, ySP) / height) * rect.height;
    const isRightHalf = index > timeline.length / 2;
    tooltip.style.left = `${isRightHalf ? leftPx - 250 : leftPx + 15}px`;
    tooltip.style.top = `${Math.max(10, Math.min(rect.height - 180, topPx - 50))}px`;
  });

  overlay.addEventListener('mouseleave', () => {
    tooltipLine.style.display = 'none';
    hoverDotsGroup.style.display = 'none';
    tooltip.style.display = 'none';
  });

  svg.appendChild(overlay);
  containerEl.appendChild(svg);
}

function createDot(color) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('r', '5');
  circle.setAttribute('fill', color);
  circle.setAttribute('stroke', '#ffffff');
  circle.setAttribute('stroke-width', '2');
  return circle;
}

/**
 * Render Side-by-side Retirement Income Comparison Bar Chart
 */
export function renderIncomeComparisonChart(containerEl, summary, isMonthly = true) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  const multiplier = isMonthly ? 1 / 12 : 1;

  const categories = [
    {
      label: 'Pot Drawdown',
      nominal: summary.potIncomeAnnualNominal * multiplier,
      real: summary.potIncomeAnnualReal * multiplier
    },
    {
      label: 'State Pension',
      nominal: summary.statePensionAnnualNominal * multiplier,
      real: summary.statePensionAnnualReal * multiplier
    },
    {
      label: 'Total Combined',
      nominal: summary.fullCombinedAnnualNominal * multiplier,
      real: summary.fullCombinedAnnualReal * multiplier
    }
  ];

  const width = 1000;
  const height = 340;
  const margin = { top: 35, right: 45, bottom: 45, left: 80 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxVal = Math.max(...categories.map(c => Math.max(c.nominal, c.real))) * 1.15 || 1000;
  const yScale = (v) => margin.top + innerHeight - (v / maxVal) * innerHeight;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'pension-chart-svg');

  const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i++) {
    const val = (maxVal / tickCount) * i;
    const y = yScale(val);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', margin.left);
    line.setAttribute('x2', width - margin.right);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#e2e8f0');
    line.setAttribute('stroke-dasharray', i === 0 ? '0' : '3 3');
    gridGroup.appendChild(line);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', margin.left - 10);
    txt.setAttribute('y', y + 4);
    txt.setAttribute('text-anchor', 'end');
    txt.setAttribute('class', 'axis-label');
    txt.textContent = `£${Math.round(val).toLocaleString()}`;
    gridGroup.appendChild(txt);
  }
  svg.appendChild(gridGroup);

  const groupWidth = innerWidth / categories.length;
  const barWidth = Math.min(80, groupWidth * 0.28);
  const gap = 14;

  categories.forEach((cat, idx) => {
    const groupCenterX = margin.left + (idx + 0.5) * groupWidth;
    const nominalX = groupCenterX - barWidth - (gap / 2);
    const realX = groupCenterX + (gap / 2);

    // Nominal Bar
    const nomY = yScale(cat.nominal);
    const nomH = innerHeight - (nomY - margin.top);
    const nomRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    nomRect.setAttribute('x', nominalX);
    nomRect.setAttribute('y', nomY);
    nomRect.setAttribute('width', barWidth);
    nomRect.setAttribute('height', Math.max(0, nomH));
    nomRect.setAttribute('rx', '4');
    nomRect.setAttribute('fill', '#0284c7');
    svg.appendChild(nomRect);

    const nomText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nomText.setAttribute('x', nominalX + barWidth / 2);
    nomText.setAttribute('y', nomY - 6);
    nomText.setAttribute('text-anchor', 'middle');
    nomText.setAttribute('class', 'chart-bar-val');
    nomText.setAttribute('fill', '#0284c7');
    nomText.textContent = `£${Math.round(cat.nominal).toLocaleString()}`;
    svg.appendChild(nomText);

    // Real Bar
    const realY = yScale(cat.real);
    const realH = innerHeight - (realY - margin.top);
    const realRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    realRect.setAttribute('x', realX);
    realRect.setAttribute('y', realY);
    realRect.setAttribute('width', barWidth);
    realRect.setAttribute('height', Math.max(0, realH));
    realRect.setAttribute('rx', '4');
    realRect.setAttribute('fill', '#10b981');
    svg.appendChild(realRect);

    const realText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    realText.setAttribute('x', realX + barWidth / 2);
    realText.setAttribute('y', realY - 6);
    realText.setAttribute('text-anchor', 'middle');
    realText.setAttribute('class', 'chart-bar-val');
    realText.setAttribute('fill', '#059669');
    realText.textContent = `£${Math.round(cat.real).toLocaleString()}`;
    svg.appendChild(realText);

    // Label
    const catLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    catLabel.setAttribute('x', groupCenterX);
    catLabel.setAttribute('y', height - margin.bottom + 20);
    catLabel.setAttribute('text-anchor', 'middle');
    catLabel.setAttribute('class', 'axis-label bold');
    catLabel.textContent = cat.label;
    svg.appendChild(catLabel);
  });

  containerEl.appendChild(svg);
}

/**
 * Render Purchasing Power Salary Trajectory Chart (Retirement Age -> 100)
 * Visualizes:
 * - Combined Private + Public Salary in Today's Purchasing Power (£)
 * - Public State Pension staying 100% flat (Triple-Lock protection)
 * - Private Pot Drawdown decreasing over the years under % drawdown
 */
export function renderPurchasingPowerIncomeChart(containerEl, timeline, retirementAge, statePensionAge, isMonthly = true) {
  if (!containerEl) return;
  containerEl.innerHTML = '';

  // Filter to retirement years only
  const retireTimeline = timeline.filter(d => d.age >= retirementAge);
  if (!retireTimeline || retireTimeline.length === 0) {
    containerEl.innerHTML = '<div class="chart-empty">No retirement data to display</div>';
    return;
  }

  const mult = isMonthly ? 1 / 12 : 1;
  const unitLabel = isMonthly ? '/mo' : '/yr';

  const width = 860;
  const height = 340;
  const margin = { top: 35, right: 35, bottom: 45, left: 75 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  // Find max combined real salary for Y scale
  const maxSalary = Math.max(...retireTimeline.map(d => (d.potDrawdownReal + (d.statePensionActive ? d.statePensionReal : 0)) * mult)) * 1.15 || 2000;

  const xScale = (i) => margin.left + (i / (retireTimeline.length - 1 || 1)) * innerWidth;
  const yScale = (v) => margin.top + innerHeight - (Math.max(0, v) / maxSalary) * innerHeight;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('class', 'pension-chart-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', "Retirement salary purchasing power decay chart");

  // Defs for gradients
  const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
  defs.innerHTML = `
    <linearGradient id="ppPublicGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0.10"/>
    </linearGradient>
    <linearGradient id="ppPrivateGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0.40"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0.08"/>
    </linearGradient>
  `;
  svg.appendChild(defs);

  // Y-axis gridlines & ticks
  const yTicksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  yTicksGroup.setAttribute('class', 'grid-lines');
  for (let i = 0; i <= 4; i++) {
    const val = (maxSalary / 4) * i;
    const y = yScale(val);

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', margin.left);
    line.setAttribute('x2', width - margin.right);
    line.setAttribute('y1', y);
    line.setAttribute('y2', y);
    line.setAttribute('stroke', '#e2e8f0');
    line.setAttribute('stroke-dasharray', i === 0 ? '0' : '3 3');
    yTicksGroup.appendChild(line);

    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', margin.left - 10);
    txt.setAttribute('y', y + 4);
    txt.setAttribute('text-anchor', 'end');
    txt.setAttribute('class', 'axis-label');
    txt.textContent = `£${Math.round(val).toLocaleString()}${unitLabel}`;
    yTicksGroup.appendChild(txt);
  }
  svg.appendChild(yTicksGroup);

  // X-axis ticks (Ages)
  const xTicksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const keyAges = [retirementAge, 72, 77, 82, 87, 92, 97, 100].filter(a => a >= retirementAge);
  retireTimeline.forEach((pt, i) => {
    if (keyAges.includes(pt.age)) {
      const x = xScale(i);
      const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      txt.setAttribute('x', x);
      txt.setAttribute('y', height - margin.bottom + 20);
      txt.setAttribute('text-anchor', 'middle');
      txt.setAttribute('class', `axis-label ${pt.age === retirementAge || pt.age === 100 ? 'bold' : ''}`);
      txt.textContent = pt.age === retirementAge ? `Age ${pt.age} (Retire)` : `Age ${pt.age}`;
      xTicksGroup.appendChild(txt);
    }
  });
  svg.appendChild(xTicksGroup);

  // Stacked Area 1: Base Layer - Public State Pension (Flat in Today's Purchasing Power)
  let publicAreaD = `M ${xScale(0)} ${yScale(0)}`;
  retireTimeline.forEach((pt, i) => {
    const spVal = (pt.statePensionActive ? pt.statePensionReal : 0) * mult;
    publicAreaD += ` L ${xScale(i)} ${yScale(spVal)}`;
  });
  publicAreaD += ` L ${xScale(retireTimeline.length - 1)} ${yScale(0)} Z`;

  const publicArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  publicArea.setAttribute('d', publicAreaD);
  publicArea.setAttribute('fill', 'url(#ppPublicGrad)');
  svg.appendChild(publicArea);

  // Public State Pension Boundary Line (Triple Lock Flat)
  const publicLinePath = retireTimeline.map((pt, i) => {
    const spVal = (pt.statePensionActive ? pt.statePensionReal : 0) * mult;
    return `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(spVal)}`;
  }).join(' ');

  const publicLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  publicLine.setAttribute('d', publicLinePath);
  publicLine.setAttribute('fill', 'none');
  publicLine.setAttribute('stroke', '#8b5cf6');
  publicLine.setAttribute('stroke-width', '2.5');
  svg.appendChild(publicLine);

  // Stacked Area 2: Private Pot Drawdown on top of State Pension
  let totalAreaD = `M ${xScale(0)} ${yScale((retireTimeline[0].statePensionActive ? retireTimeline[0].statePensionReal : 0) * mult)}`;
  retireTimeline.forEach((pt, i) => {
    const totalVal = ((pt.statePensionActive ? pt.statePensionReal : 0) + pt.potDrawdownReal) * mult;
    totalAreaD += ` L ${xScale(i)} ${yScale(totalVal)}`;
  });
  // Close down to the top of the public line
  for (let i = retireTimeline.length - 1; i >= 0; i--) {
    const pt = retireTimeline[i];
    const spVal = (pt.statePensionActive ? pt.statePensionReal : 0) * mult;
    totalAreaD += ` L ${xScale(i)} ${yScale(spVal)}`;
  }
  totalAreaD += ' Z';

  const privateArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  privateArea.setAttribute('d', totalAreaD);
  privateArea.setAttribute('fill', 'url(#ppPrivateGrad)');
  svg.appendChild(privateArea);

  // Total Combined Salary Top Boundary Line
  const totalLinePath = retireTimeline.map((pt, i) => {
    const totalVal = ((pt.statePensionActive ? pt.statePensionReal : 0) + pt.potDrawdownReal) * mult;
    return `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(totalVal)}`;
  }).join(' ');

  const totalLine = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  totalLine.setAttribute('d', totalLinePath);
  totalLine.setAttribute('fill', 'none');
  totalLine.setAttribute('stroke', '#0284c7');
  totalLine.setAttribute('stroke-width', '3');
  svg.appendChild(totalLine);

  // Visual Annotations on Chart
  // 1. Triple lock label along the public line
  const midIndex = Math.round(retireTimeline.length * 0.45);
  const midPt = retireTimeline[midIndex];
  if (midPt) {
    const spMidY = yScale(((midPt.statePensionActive ? midPt.statePensionReal : 0) * mult) / 2);
    const spNote = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    spNote.setAttribute('x', xScale(midIndex));
    spNote.setAttribute('y', spMidY + 4);
    spNote.setAttribute('text-anchor', 'middle');
    spNote.setAttribute('class', 'chart-annot-sp');
    spNote.textContent = '★ Public State Pension: 100% Constant in Today’s Purchasing Power (Triple-Lock)';
    svg.appendChild(spNote);

    // Private decay arrow label
    const totalMidY = yScale((((midPt.statePensionActive ? midPt.statePensionReal : 0) + midPt.potDrawdownReal) * mult));
    const privateNote = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    privateNote.setAttribute('x', xScale(midIndex));
    privateNote.setAttribute('y', totalMidY - 8);
    privateNote.setAttribute('text-anchor', 'middle');
    privateNote.setAttribute('class', 'chart-annot-private');
    privateNote.textContent = '↓ Private Pot Income: Decreases in Today’s Purchasing Power as % Drawdown outpaces real returns';
    svg.appendChild(privateNote);
  }

  // Interactive Hover Overlay
  const hoverLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  hoverLine.setAttribute('class', 'chart-hover-line');
  hoverLine.setAttribute('y1', margin.top);
  hoverLine.setAttribute('y2', height - margin.bottom);
  hoverLine.style.display = 'none';
  svg.appendChild(hoverLine);

  const dotTotal = createDot('#0284c7');
  const dotPublic = createDot('#8b5cf6');
  const hoverDotsGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  hoverDotsGroup.style.display = 'none';
  hoverDotsGroup.append(dotTotal, dotPublic);
  svg.appendChild(hoverDotsGroup);

  const tooltip = document.createElement('div');
  tooltip.className = 'chart-tooltip';
  tooltip.style.display = 'none';
  containerEl.appendChild(tooltip);

  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  overlay.setAttribute('x', margin.left);
  overlay.setAttribute('y', margin.top);
  overlay.setAttribute('width', innerWidth);
  overlay.setAttribute('height', innerHeight);
  overlay.setAttribute('fill', 'transparent');
  overlay.style.cursor = 'crosshair';

  overlay.addEventListener('mousemove', (e) => {
    const rect = svg.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (margin.left * rect.width / width)) / (innerWidth * rect.width / width)));
    const index = Math.round(ratio * (retireTimeline.length - 1));
    const pt = retireTimeline[index];
    if (!pt) return;

    const xPos = xScale(index);
    hoverLine.setAttribute('x1', xPos);
    hoverLine.setAttribute('x2', xPos);
    hoverLine.style.display = 'block';

    const spVal = (pt.statePensionActive ? pt.statePensionReal : 0) * mult;
    const privVal = pt.potDrawdownReal * mult;
    const totalVal = spVal + privVal;

    const yTot = yScale(totalVal);
    const yPub = yScale(spVal);

    dotTotal.setAttribute('cx', xPos);
    dotTotal.setAttribute('cy', yTot);
    dotPublic.setAttribute('cx', xPos);
    dotPublic.setAttribute('cy', yPub);
    hoverDotsGroup.style.display = 'block';

    const dropText = pt.privateDropPercent < -0.1
      ? `<span class="badge-loss">${pt.privateDropPercent.toFixed(1)}% vs Year 1</span>`
      : `<span style="color:#059669; font-weight:600;">Day 1 Baseline</span>`;

    tooltip.innerHTML = `
      <div class="tooltip-header">
        <span>Age ${pt.age} (${pt.age - retirementAge} yrs retired)</span>
        <span class="badge-phase retirement">Today's Money</span>
      </div>
      <div class="tooltip-row"><span class="badge-dot" style="background:#0284c7"></span> Total Combined Salary: <strong>${formatGBP(totalVal)} ${unitLabel}</strong></div>
      <div class="tooltip-row"><span class="badge-dot" style="background:#10b981"></span> Private Pot Drawdown: <strong>${formatGBP(privVal)} ${unitLabel}</strong> (${dropText})</div>
      <div class="tooltip-row"><span class="badge-dot" style="background:#8b5cf6"></span> Public State Pension: <strong>${formatGBP(spVal)} ${unitLabel}</strong> (100% constant)</div>
      <div class="tooltip-row small-muted">Inflation deflator applied: ÷${pt.inflationFactor.toFixed(2)}x</div>
    `;
    tooltip.style.display = 'block';

    const leftPx = (xPos / width) * rect.width;
    const topPx = (yTot / height) * rect.height;
    const isRightHalf = index > retireTimeline.length / 2;
    tooltip.style.left = `${isRightHalf ? leftPx - 260 : leftPx + 15}px`;
    tooltip.style.top = `${Math.max(10, Math.min(rect.height - 150, topPx - 50))}px`;
  });

  overlay.addEventListener('mouseleave', () => {
    hoverLine.style.display = 'none';
    hoverDotsGroup.style.display = 'none';
    tooltip.style.display = 'none';
  });

  svg.appendChild(overlay);
  containerEl.appendChild(svg);
}

