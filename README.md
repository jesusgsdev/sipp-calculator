# UK Pension & SIPP Forecaster

[![CI](https://github.com/jesusgsdev/sipp-calculator/actions/workflows/ci.yml/badge.svg)](https://github.com/jesusgsdev/sipp-calculator/actions/workflows/ci.yml)
[![Deploy](https://github.com/jesusgsdev/sipp-calculator/actions/workflows/pages.yml/badge.svg)](https://github.com/jesusgsdev/sipp-calculator/actions/workflows/pages.yml)
[![CodeQL](https://github.com/jesusgsdev/sipp-calculator/actions/workflows/codeql.yml/badge.svg)](https://github.com/jesusgsdev/sipp-calculator/actions/workflows/codeql.yml)
[![OpenSSF Scorecard](https://api.securityscorecards.dev/projects/github.com/jesusgsdev/sipp-calculator/badge)](https://scorecard.dev/viewer/?uri=github.com/jesusgsdev/sipp-calculator)
[![License: MIT](https://img.shields.io/github/license/jesusgsdev/sipp-calculator)](LICENSE)
[![Last commit](https://img.shields.io/github/last-commit/jesusgsdev/sipp-calculator)](https://github.com/jesusgsdev/sipp-calculator/commits/main)
[![Stars](https://img.shields.io/github/stars/jesusgsdev/sipp-calculator?style=flat)](https://github.com/jesusgsdev/sipp-calculator/stargazers)
[![Live demo](https://img.shields.io/badge/demo-live-brightgreen)](https://jesusgsdev.github.io/sipp-calculator/)
[![UK Compliance](https://img.shields.io/badge/UK%20Pension%20Rules-2025%2F26%20%26%202026%2F27-blue.svg)](#key-features)
[![Zero Dependencies](https://img.shields.io/badge/dependencies-0%20(Vanilla%20JS)-success.svg)](#quick-start)
[![Privacy](https://img.shields.io/badge/privacy-100%25%20Client--Side-blueviolet.svg)](#data-privacy--local-profiles)
[![AI Ready](https://img.shields.io/badge/AI%20Context-llms.txt%20supported-orange.svg)](llms.txt)

> **Live Application**: [https://jesusgsdev.github.io/sipp-calculator/](https://jesusgsdev.github.io/sipp-calculator/)

An open-source, private, client-side web application for forecasting UK workplace pensions and Self-Invested Personal Pensions (SIPPs), strictly adhering to official UK pension regulations and HMRC tax rules.

---

## Key Features

- **Full UK Pension Regulatory Compliance**:
  - **25% Pension Commencement Lump Sum (PCLS)**: Models taking up to 25% tax-free lump sum at retirement, strictly enforcing the statutory **Lump Sum Allowance (LSA) cap of £268,275** under the Finance Act 2024.
  - **Personal SIPP with HMRC Tax Relief**: Models personal SIPP payments made from take-home pay, automatically factoring in HMRC's 20% basic rate relief at source (+25% gross top-up), plus highlighting higher (40%) and additional (45%) rate relief reclaimable via Self-Assessment.
  - **Post-Retirement Gross vs Net Income Estimation**: Calculates UK Income Tax in retirement using standard tax bands (20% basic rate above £12,570, 40% higher rate above £50,270, 45% additional rate above £125,140, and the £100,000–£125,140 Personal Allowance taper), displaying estimated net monthly take-home income.
  - **Lifetime Decumulation Simulation to Age 100**: Continuously models the remaining invested pot under annual drawdown withdrawals, investment returns, and inflation through age 100, detecting safe longevity or pinpointing the exact year of pot depletion.
  - **UK State Pension with Triple-Lock Parity**: Models the full new UK State Pension (£11,973.60/year in 2025/26; projected £12,548.80/year in 2026/27), maintaining real purchasing power in today's money.
  - **Private vs Public Monthly Income Breakdown**: Interactive slider on the main hero card allowing you to explore your monthly retirement income and the split between private drawdown and the UK State Pension from retirement age through age 100.
  - **PLSA Retirement Living Standards Benchmark**: Automatically benchmarks your projected retirement income against the UK Pensions and Lifetime Savings Association (PLSA) standards (Minimum £14,400, Moderate £31,300, Comfortable £43,100).
  - **Auto-Enrolment & Employer Match**: Configurable employer contributions (statutory 3% minimum default) and employee contributions.

- **Input Ranges & Age Limits**:
  - **Current Age**: 18 to 71 years old.
  - **Target Retirement Age**: 55 to 72 years old (target retirement age must be at least current age + 1).
  - **Simulation Horizon**: Continues through age 100.

- **Nominal vs Real Inflation-Adjusted Comparison**:
  - Compares future nominal pounds (actual cash at retirement) directly against **Today's Money (Real £)** discounted by $(1 + \text{inflation})^N$.
  - View figures as **Monthly (£/month)** or **Yearly (£/year)**.

- **Interactive Visualizations (Zero Dependencies)**:
  - **Growth Timeline Chart**: High-resolution SVG showing nominal pot accumulation, real purchasing power, and total contributions with interactive hover crosshairs.
  - **Income Comparison Bar Chart**: Side-by-side comparison of pot drawdown, State Pension, and total combined income.

- **Data Privacy & Local Profiles**:
  - 100% client-side: no external analytics, trackers, cookies, or backend servers.
  - Named profile management stored locally in your browser's `localStorage`. Profiles remain persistent across browser restarts on your machine.
  - Export year-by-year projections to **CSV** or print formatted reports.

---

## Discoverability & AI Search (GEO)

This project implements modern AI & web discoverability standards:
- **`llms.txt`**: Standard AI context file for LLM engines (Perplexity, ChatGPT, Claude, Copilot) summarizing core rules, mathematical models, and tools: [`llms.txt`](llms.txt).
- **`llms-full.txt`**: Deep technical documentation and comprehensive Q&A for language models: [`llms-full.txt`](llms-full.txt).
- **`robots.txt`**: Openly welcomes web and AI search agents (`GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, etc.): [`robots.txt`](robots.txt).
- **`sitemap.xml`**: Standard crawler sitemap: [`sitemap.xml`](sitemap.xml).
- **Schema.org Structured Data**: JSON-LD `WebApplication` and `FAQPage` schemas embedded for rich snippets.

---

## Quick Start

You can run the web interface directly in any modern browser without installing Node.js or external build tools:

```bash
# Serve locally via Python
python3 -m http.server 8080

# Then open in browser:
# http://localhost:8080
```

Or open `index.html` directly in your browser.

---

## Running Tests

Unit tests verify the core financial modeling calculations:

```bash
npm test            # Node's built-in test runner, no dependencies
npm run coverage    # adds a coverage report
```

16 comprehensive tests verify:
1. Standard percentage workplace contribution projections
2. Fixed monthly contributions & early retirement prior to State Pension age
3. Statutory 25% tax-free Lump Sum Allowance cap (£268,275)
4. State Pension Triple Lock inflation parity
5. Decumulation and pot trajectory through age 100
6. High drawdown depletion detection
7. Personal SIPP HMRC basic rate tax relief (+25% top-up) and higher rate breakdown
8. Monthly private vs public pension distribution
9. Percentage drawdown real purchasing power erosion
10. UK income tax bands and Personal Allowance taper (£100k–£125k)
11. Post-retirement income tax application
12. Salary indexation on contributions
13. Tax relief caps and Annual Allowance (£60,000)
14. Retirement-year initial drawdown deduction
15. Gross vs net monthly income estimation
16. Maximum current age (71) and maximum retirement age (72) bounds

---

## Mathematical Modeling

1. **Salary Progression**:
   $$S_t = S_0 \times (1 + g)^{t-1}$$
   where $g$ is the annual salary growth rate.

2. **Annual Contributions**:
   - Employee workplace: $C_{\text{emp}, t} = S_t \times p_{\text{emp}}$ (or fixed amount indexed to $g$)
   - Employer workplace: $C_{\text{er}, t} = S_t \times p_{\text{er}}$
   - Personal SIPP: $S_{\text{gross}, t} = M_{\text{sipp}} \times 12 \times (1 + g)^{t-1} \times 1.25$
   - Total annual contribution: $C_t = \min\left(C_{\text{emp}, t} + C_{\text{er}, t} + S_{\text{gross}, t}, \text{AnnualAllowance}\right)$

3. **Pot Compounding**:
   $$P_t = P_{t-1} \times (1 + r_{\text{net}}) + C_t \times \left(1 + \frac{r_{\text{net}}}{2}\right)$$
   where $r_{\text{net}} = r_{\text{nominal}} - r_{\text{fees}}$.

4. **Inflation Deflator (Real Purchasing Power)**:
   $$\text{Deflator}_N = (1 + i)^N$$
   $$\text{Pot}_{\text{real}} = \frac{\text{Pot}_{\text{nominal}}}{\text{Deflator}_N}$$

5. **25% Lump Sum (PCLS)**:
   $$\text{LumpSum}_{\text{nominal}} = \min(0.25 \times \text{Pot}_{\text{nominal}}, £268,275)$$
   $$\text{RemainingPot}_{\text{nominal}} = \text{Pot}_{\text{nominal}} - \text{LumpSum}_{\text{nominal}}$$

6. **State Pension (Triple Lock)**:
   $$\text{StatePension}_{\text{nominal}} = \text{StatePension}_0 \times (1 + i)^N$$
   $$\text{StatePension}_{\text{real}} = \text{StatePension}_0$$

---

## License

MIT License. Open source and free for personal and commercial financial modeling.
