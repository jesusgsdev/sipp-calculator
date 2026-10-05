# UK Pension & SIPP Forecaster

A modern, accessible web interface for forecasting UK workplace pensions and Self-Invested Personal Pensions (SIPPs), adhering to official UK pension regulations and guidelines.

## Features

- **Full UK Pension Compliance**:
  - **25% Pension Commencement Lump Sum (PCLS)**: Models taking up to 25% tax-free lump sum at retirement, strictly adhering to the UK statutory Lump Sum Allowance cap of **£268,275**.
  - **External Personal SIPP with HMRC Tax Relief**: Models personal SIPP contributions from net take-home pay, automatically adding HMRC's 20% basic rate relief at source (+25% gross top-up), plus highlighting higher (40%) and additional (45%) rate tax relief claimable via Self-Assessment.
  - **Decumulation & Drawdown Modeling until Age 100**: Continuously models the remaining invested pot under annual drawdown withdrawals, investment returns, and inflation up to age 100, including automatic detection of pot depletion or surplus longevity.
  - **UK State Pension with Triple-Lock Parity**: Models the full new UK State Pension (£11,973/year or £230.25/week in 2025/26), assuming the triple-lock maintains purchasing power matching the chosen inflation rate, plotted directly on the lifetime chart.
  - **Monthly Income Breakdown**: Prominently separates how much of the monthly retirement income is funded by your **Private Pension Pot Drawdown** vs. the **UK Public State Pension**, including percentage shares.
  - **PLSA Retirement Living Standards Benchmark**: Automatically benchmarks your projected retirement income against the UK Pensions and Lifetime Savings Association (PLSA) standards (Minimum £14,400, Moderate £31,300, Comfortable £43,100).
  - **Auto-Enrolment & Employer Match**: Configurable employer contributions (default statutory 3% minimum) and employee contributions.

- **Comprehensive Inputs**:
  - **Current Age** & **Target Retirement Age** (with automatic validation and remaining years calculation).
  - **Annual Gross Salary** with an estimate for **Annual Salary Increase (%)**.
  - **Employee Contribution Mode**: Switch seamlessly between **% of Annual Salary** and **Fixed Monthly Amount (£/month)** with instant reciprocal conversion.
  - **Inflation Rate Selection (%)**: Custom slider and numeric input to model inflation scenarios.
  - **Investment Growth (%)** and **Fund / Platform Fees (%)** with live Net Real Return estimation.
  - **Drawdown Withdrawal Rate (%)**: Adjustable safe withdrawal rate (default 4.0%).

- **Nominal vs. Real Inflation-Adjusted Comparison**:
  - Compares future nominal figures (the actual cash amount in retirement) directly against the purchasing power in **Today's Money (Real £)**.
  - Frequency toggle: view figures as **Monthly (£/month)** or **Yearly (£/year)**.
  - Side-by-side comparison matrix displaying purchasing power erosion for every component.

- **Interactive Visualizations (Zero Dependencies)**:
  - **Growth Timeline Chart**: High-resolution responsive SVG showing nominal pot accumulation, real purchasing power, and total contributions with hover crosshair tooltips.
  - **Income Comparison Bar Chart**: Side-by-side comparison of pot drawdown, State Pension, and total combined income.

- **Full Year-by-Year Schedule & Export**:
  - Detailed audit table from current age to retirement age.
  - **CSV Export** and **Print Report** functionality.

## Quick Start

You can run the web interface directly in any modern browser without needing to install external packages:

```bash
# Option 1: Serve locally via Python
python3 -m http.server 8080

# Then open in browser:
# http://localhost:8080
```

Or simply open `index.html` directly in your web browser.

## Running Tests

Unit tests verify the core financial modeling calculations:

```bash
node test/calculator.test.js
```

## Mathematical Modeling

1. **Salary Progression**:
   $$S_t = S_0 \times (1 + g)^{t-1}$$
   where $g$ is the annual salary growth rate.

2. **Annual Contributions**:
   - If percentage: $C_{emp, t} = S_t \times p_{emp}$
   - If fixed amount: $C_{emp, t} = M_{emp} \times 12$
   - Employer: $C_{er, t} = S_t \times p_{er}$
   - Total annual contribution: $C_t = C_{emp, t} + C_{er, t}$

3. **Pot Compounding**:
   $$P_t = P_{t-1} \times (1 + r_{net}) + C_t \times \left(1 + \frac{r_{net}}{2}\right)$$
   where $r_{net} = r_{nominal} - r_{fees}$.

4. **Inflation Deflator**:
   $$\text{Deflator}_N = (1 + i)^N$$
   $$\text{Pot}_{\text{real}} = \frac{\text{Pot}_{\text{nominal}}}{\text{Deflator}_N}$$

5. **25% Lump Sum (PCLS)**:
   $$\text{LumpSum}_{\text{nominal}} = \min(0.25 \times \text{Pot}_{\text{nominal}}, £268,275)$$
   $$\text{RemainingPot}_{\text{nominal}} = \text{Pot}_{\text{nominal}} - \text{LumpSum}_{\text{nominal}}$$

6. **State Pension (Triple Lock)**:
   $$\text{StatePension}_{\text{nominal}} = \text{StatePension}_0 \times (1 + i)^N$$
   $$\text{StatePension}_{\text{real}} = \text{StatePension}_0$$

