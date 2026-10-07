/**
 * UK Pension Calculator Engine
 * Complies with UK pension guidelines:
 * - 25% Tax-Free Pension Commencement Lump Sum (PCLS) capped at statutory Lump Sum Allowance (£268,275)
 * - Auto-enrolment defaults and workplace pension contributions
 * - External Personal SIPP with HMRC Basic Rate Tax Relief (+25% top-up on net contributions)
 * - UK State Pension triple-lock inflation parity modeling across all years
 * - Nominal (future value) vs Real (today's purchasing power) deflation
 * - Full Decumulation & Drawdown modeling until Age 100
 */

export const UK_DEFAULTS = {
  MIN_RETIREMENT_AGE: 55, // Rising to 57 in UK from 2028
  DEFAULT_STATE_PENSION_AGE: 67,
  CURRENT_FULL_STATE_PENSION_ANNUAL: 12547.6, // 2026/27 full new state pension (£241.30/week * 52)
  LUMP_SUM_ALLOWANCE_LIMIT: 268275.0, // UK PCLS cap unless protected
  DEFAULT_INFLATION: 2.5,
  DEFAULT_SALARY_INCREASE: 3.0,
  DEFAULT_INVESTMENT_GROWTH: 6.0,
  DEFAULT_FEES: 0.5,
  DEFAULT_DRAWDOWN_RATE: 4.0, // 4% rule
  MAX_AGE: 100, // Projection horizon
  PLSA_STANDARDS: {
    minimum: 14400,
    moderate: 31300,
    comfortable: 43100
  },
  // UK Income Tax (England, Wales & NI) 2026/27
  PERSONAL_ALLOWANCE: 12570,
  BASIC_RATE_BAND: 37700, // taxable income taxed at 20% (up to £50,270 gross)
  ADDITIONAL_RATE_THRESHOLD: 125140,
  PA_TAPER_THRESHOLD: 100000,
  THRESHOLD_FREEZE_YEARS: 4, // thresholds frozen until April 2031 (2030/31), then assumed to rise with inflation
  ANNUAL_ALLOWANCE: 60000 // gross pension contributions per tax year (standard, untapered)
};

/**
 * UK income tax breakdown on a gross annual taxable income (rUK bands).
 * @param {number} income - gross taxable income (nominal £)
 * @param {number} thresholdFactor - multiplier applied to bands (1 while frozen)
 */
export function calculateTaxBreakdown(income, thresholdFactor = 1) {
  if (income <= 0) {
    return {
      personalAllowance: UK_DEFAULTS.PERSONAL_ALLOWANCE * thresholdFactor,
      taxableIncome: 0,
      basicRateTax: 0,
      higherRateTax: 0,
      additionalRateTax: 0,
      totalTax: 0,
      effectiveRate: 0
    };
  }
  const f = thresholdFactor;
  let pa = UK_DEFAULTS.PERSONAL_ALLOWANCE * f;
  const taperStart = UK_DEFAULTS.PA_TAPER_THRESHOLD * f;
  if (income > taperStart) pa = Math.max(0, pa - (income - taperStart) / 2);
  const taxable = Math.max(0, income - pa);
  const basicBand = UK_DEFAULTS.BASIC_RATE_BAND * f;
  const addThreshold = UK_DEFAULTS.ADDITIONAL_RATE_THRESHOLD * f;
  const basic = Math.min(taxable, basicBand) * 0.20;
  const higher = Math.max(0, Math.min(taxable, addThreshold) - basicBand) * 0.40;
  const additional = Math.max(0, taxable - addThreshold) * 0.45;
  const totalTax = basic + higher + additional;
  const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;
  return {
    personalAllowance: pa,
    taxableIncome: taxable,
    basicRateTax: basic,
    higherRateTax: higher,
    additionalRateTax: additional,
    totalTax,
    effectiveRate
  };
}

/**
 * UK income tax on a gross annual income (rUK bands).
 * @param {number} income - gross taxable income (nominal £)
 * @param {number} thresholdFactor - multiplier applied to bands (1 while frozen)
 */
export function calculateIncomeTax(income, thresholdFactor = 1) {
  return calculateTaxBreakdown(income, thresholdFactor).totalTax;
}

/**
 * Calculates pension forecast including external SIPP and drawdown until age 100
 * @param {Object} params
 * @param {number} [params.externalSippMonthlyNet=0] - Monthly net £ contributed to separate SIPP
 * @param {'basic'|'higher'|'additional'} [params.taxBand='basic'] - Tax band for relief calculation
 */
export function calculatePensionForecast(params) {
  const currentAge = Math.max(18, Math.min(71, Number(params.currentAge) || 30));
  const retirementAge = Math.max(currentAge + 1, Math.min(72, Number(params.retirementAge) || 67));
  const maxAge = UK_DEFAULTS.MAX_AGE;
  const yearsToRetire = retirementAge - currentAge;

  const initialSalary = Math.max(0, Number(params.annualSalary) || 0);
  const salaryIncreaseRate = (Number(params.annualSalaryIncrease) || 0) / 100;
  const inflationRate = (Number(params.inflationRate) || 0) / 100;
  const nominalGrowthRate = (Number(params.investmentGrowthRate) || 0) / 100;
  const feeRate = (Number(params.feeRate) || 0) / 100;
  const netGrowthRate = Math.max(-0.2, nominalGrowthRate - feeRate);

  const initialPot = Math.max(0, Number(params.currentPot) || 0);
  const contributionType = params.contributionType === 'amount' ? 'amount' : 'percent';
  const employeeInput = Math.max(0, Number(params.employeeContribution) || 0);
  const employerPercent = (Number(params.employerContributionPercent) || 0) / 100;

  // External SIPP Contributions & HMRC Tax Relief
  // Under UK Relief at Source, paying £80 net results in HMRC automatically adding £20 (25% of net) into the SIPP.
  // Gross SIPP = Net / (1 - 0.20) = Net * 1.25.
  const externalSippMonthlyNet = Math.max(0, Number(params.externalSippMonthlyNet) || 0);
  const sippNetAnnual = externalSippMonthlyNet * 12;
  const sippHmrcReliefAnnual = sippNetAnnual * 0.25; // 20% basic rate relief at source
  const sippGrossAnnual = sippNetAnnual + sippHmrcReliefAnnual;

  const userTaxBand = params.taxBand || 'basic'; // 'basic', 'higher', 'additional'
  // Extra relief claimable by higher/additional rate taxpayers via Self Assessment (outside SIPP pot)
  let sippSelfAssessmentReliefAnnual = 0;
  if (userTaxBand === 'higher') {
    sippSelfAssessmentReliefAnnual = sippGrossAnnual * 0.20; // extra 20%
  } else if (userTaxBand === 'additional') {
    sippSelfAssessmentReliefAnnual = sippGrossAnnual * 0.25; // extra 25%
  }

  const takeLumpSum = params.takeLumpSum !== false;
  const numOr = (v, d) => (v === undefined || v === null || v === '' || isNaN(Number(v))) ? d : Number(v);
  const lumpSumPercent = takeLumpSum ? Math.min(25, Math.max(0, numOr(params.lumpSumPercent, 25))) / 100 : 0;
  const drawdownRate = Math.max(0, numOr(params.drawdownRate, UK_DEFAULTS.DEFAULT_DRAWDOWN_RATE)) / 100;

  const includeStatePension = params.includeStatePension !== false;
  const baselineStatePension = Math.max(0, Number(params.statePensionAnnual) || UK_DEFAULTS.CURRENT_FULL_STATE_PENSION_ANNUAL);
  const statePensionAge = Number(params.statePensionAge) || UK_DEFAULTS.DEFAULT_STATE_PENSION_AGE;

  // Phase 1: Year-by-year Accumulation (currentAge -> retirementAge)
  let potNominal = initialPot;
  let currentSalary = initialSalary;
  let cumulativeEmployeeContribNominal = 0;
  let cumulativeEmployerContribNominal = 0;
  let cumulativeSippNetNominal = 0;
  let cumulativeSippHmrcReliefNominal = 0;
  let cumulativeGrowthNominal = 0;

  const accumulationTimeline = [];
  const fullTimeline = [];

  const contributionWarnings = { reliefCapAge: null, annualAllowanceAge: null, annualAllowanceExcessAge: null };

  for (let year = 1; year <= yearsToRetire; year++) {
    const ageAtEnd = currentAge + year;
    const startPot = potNominal;

    if (year > 1) {
      currentSalary = currentSalary * (1 + salaryIncreaseRate);
    }

    let employeeAnnualContrib = 0;
    if (contributionType === 'percent') {
      employeeAnnualContrib = currentSalary * (employeeInput / 100);
    } else {
      // Fixed £ amounts rise in line with salary (pay rises) so they keep the same share of pay
      employeeAnnualContrib = employeeInput * 12 * Math.pow(1 + salaryIncreaseRate, year - 1);
    }

    const employerAnnualContrib = currentSalary * employerPercent;
    const workplaceAnnualContrib = employeeAnnualContrib + employerAnnualContrib;

    // External SIPP: net contribution rises with inflation to keep its real value
    let yearSippGross = sippGrossAnnual * Math.pow(1 + inflationRate, year - 1);

    // HMRC rule: personal (employee + SIPP) gross contributions only get relief up to 100% of relevant earnings
    const reliefRoom = Math.max(0, currentSalary - employeeAnnualContrib);
    if (yearSippGross > reliefRoom) {
      yearSippGross = reliefRoom;
      if (!contributionWarnings.reliefCapAge) contributionWarnings.reliefCapAge = ageAtEnd;
    }

    // Annual Allowance (£60k gross total). SIPP is reduced first to avoid an AA tax charge.
    const aaExcess = workplaceAnnualContrib + yearSippGross - UK_DEFAULTS.ANNUAL_ALLOWANCE;
    if (aaExcess > 0) {
      const sippCut = Math.min(yearSippGross, aaExcess);
      if (sippCut > 0) {
        yearSippGross -= sippCut;
        if (!contributionWarnings.annualAllowanceAge) contributionWarnings.annualAllowanceAge = ageAtEnd;
      }
      if (aaExcess - sippCut > 0 && !contributionWarnings.annualAllowanceExcessAge) {
        contributionWarnings.annualAllowanceExcessAge = ageAtEnd; // workplace alone exceeds AA
      }
    }
    const yearSippNet = yearSippGross * 0.8;
    const yearSippRelief = yearSippGross - yearSippNet;

    // Total new contributions this year including SIPP gross (net + HMRC relief)
    const totalAnnualContrib = workplaceAnnualContrib + yearSippGross;

    const investmentGain = (startPot * netGrowthRate) + (totalAnnualContrib * (netGrowthRate / 2));
    potNominal = startPot + totalAnnualContrib + investmentGain;

    cumulativeEmployeeContribNominal += employeeAnnualContrib;
    cumulativeEmployerContribNominal += employerAnnualContrib;
    cumulativeSippNetNominal += yearSippNet;
    cumulativeSippHmrcReliefNominal += yearSippRelief;
    cumulativeGrowthNominal += investmentGain;

    const inflationFactor = Math.pow(1 + inflationRate, year);
    const potReal = potNominal / inflationFactor;

    // Public State Pension under Triple-Lock (compounding with inflation)
    const statePensionNominalThisYear = baselineStatePension * inflationFactor;
    const statePensionRealThisYear = baselineStatePension;

    const point = {
      phase: 'accumulation',
      year,
      age: ageAtEnd,
      salary: currentSalary,
      employeeContrib: employeeAnnualContrib,
      employerContrib: employerAnnualContrib,
      workplaceContrib: workplaceAnnualContrib,
      sippNetContrib: yearSippNet,
      sippHmrcRelief: yearSippRelief,
      sippGrossContrib: yearSippGross,
      totalContrib: totalAnnualContrib,
      investmentGain,
      closingPotNominal: potNominal,
      closingPotReal: potReal,
      potDrawdownNominal: 0,
      potDrawdownReal: 0,
      // Public State Pension entitlement trajectory
      statePensionNominal: statePensionNominalThisYear,
      statePensionReal: statePensionRealThisYear,
      statePensionActive: includeStatePension && (ageAtEnd >= statePensionAge),
      totalIncomeNominal: 0,
      totalIncomeReal: 0,
      cumulativeEmployeeNominal: cumulativeEmployeeContribNominal,
      cumulativeEmployerNominal: cumulativeEmployerContribNominal,
      cumulativeSippNetNominal,
      cumulativeSippHmrcReliefNominal,
      cumulativeSippGrossNominal: cumulativeSippNetNominal + cumulativeSippHmrcReliefNominal,
      cumulativeGrowthNominal,
      inflationFactor
    };

    accumulationTimeline.push(point);
    fullTimeline.push(point);
  }

  // Retirement Point Summary (At Target Retirement Age)
  const finalPotNominal = potNominal;
  const totalInflationDeflator = Math.pow(1 + inflationRate, yearsToRetire);
  const finalPotReal = finalPotNominal / totalInflationDeflator;

  // 25% Tax-Free Lump Sum (PCLS)
  let lumpSumNominal = 0;
  if (takeLumpSum && lumpSumPercent > 0) {
    const rawLumpSum = finalPotNominal * lumpSumPercent;
    lumpSumNominal = Math.min(rawLumpSum, UK_DEFAULTS.LUMP_SUM_ALLOWANCE_LIMIT);
  }
  const lumpSumReal = lumpSumNominal / totalInflationDeflator;

  // Remaining pot for drawdown
  const remainingPotNominal = Math.max(0, finalPotNominal - lumpSumNominal);
  const remainingPotReal = Math.max(0, finalPotReal - lumpSumReal);

  // Private Pension Income from Pot Drawdown
  const annualPotIncomeNominal = remainingPotNominal * drawdownRate;
  const monthlyPotIncomeNominal = annualPotIncomeNominal / 12;

  const annualPotIncomeReal = remainingPotReal * drawdownRate;
  const monthlyPotIncomeReal = annualPotIncomeReal / 12;

  // State Pension at Retirement
  let annualStatePensionNominal = 0;
  let annualStatePensionReal = 0;
  const isEligibleForStatePension = includeStatePension && (retirementAge >= statePensionAge);

  if (includeStatePension) {
    // Nominal value at the first year it is received alongside the pot income (later of SPA and retirement)
    const spDeflator = Math.pow(1 + inflationRate, Math.max(0, Math.max(statePensionAge, retirementAge) - currentAge));
    annualStatePensionNominal = baselineStatePension * spDeflator;
    annualStatePensionReal = baselineStatePension;
  }

  const monthlyStatePensionNominal = annualStatePensionNominal / 12;
  const monthlyStatePensionReal = annualStatePensionReal / 12;

  // Combined totals at retirement
  const totalAnnualIncomeNominal = annualPotIncomeNominal + (isEligibleForStatePension ? annualStatePensionNominal : 0);
  const totalMonthlyIncomeNominal = totalAnnualIncomeNominal / 12;

  const totalAnnualIncomeReal = annualPotIncomeReal + (isEligibleForStatePension ? annualStatePensionReal : 0);
  const totalMonthlyIncomeReal = totalAnnualIncomeReal / 12;

  // Full future combined income once state pension is active
  const fullCombinedAnnualNominal = annualPotIncomeNominal + annualStatePensionNominal;
  const fullCombinedMonthlyNominal = fullCombinedAnnualNominal / 12;
  const fullCombinedAnnualReal = annualPotIncomeReal + annualStatePensionReal;
  const fullCombinedMonthlyReal = fullCombinedAnnualReal / 12;

  // Proportions of monthly retirement income (Private vs Public)
  const privateIncomeMonthlyReal = monthlyPotIncomeReal;
  const publicIncomeMonthlyReal = monthlyStatePensionReal;
  const totalCombinedMonthlyReal = fullCombinedMonthlyReal;

  const privateSharePercent = totalCombinedMonthlyReal > 0 ? (privateIncomeMonthlyReal / totalCombinedMonthlyReal) * 100 : 0;
  const publicSharePercent = totalCombinedMonthlyReal > 0 ? (publicIncomeMonthlyReal / totalCombinedMonthlyReal) * 100 : 0;

  // Income tax on retirement income.
  // If the tax-free lump sum was taken upfront, all later drawdown is taxable; otherwise 25% of each withdrawal is tax-free (UFPLS).
  const privateTaxableFraction = (takeLumpSum && lumpSumNominal > 0) ? 1 : 0.75;
  const taxForYear = (totalYear, privateNominal, spNominal) => {
    const yearsIndexed = Math.max(0, totalYear - UK_DEFAULTS.THRESHOLD_FREEZE_YEARS);
    const thresholdFactor = Math.pow(1 + inflationRate, yearsIndexed);
    const taxableIncome = privateNominal * privateTaxableFraction + spNominal;
    return calculateIncomeTax(taxableIncome, thresholdFactor);
  };
  const netRealAt = (totalYear, privateReal, spReal) => {
    const f = Math.pow(1 + inflationRate, totalYear);
    const tax = taxForYear(totalYear, privateReal * f, spReal * f);
    return { taxNominal: tax, netNominal: (privateReal + spReal) * f - tax, netReal: privateReal + spReal - tax / f };
  };

  const retireTax = netRealAt(yearsToRetire, annualPotIncomeReal, isEligibleForStatePension ? annualStatePensionReal : 0);
  const spStartYear = Math.max(statePensionAge, retirementAge) - currentAge;
  const fullCombinedTax = netRealAt(spStartYear, annualPotIncomeReal, includeStatePension ? annualStatePensionReal : 0);

  // Drawdown Strategy: 'percentOfPot' (withdraw fixed % of remaining pot each year) or 'flatReal' (inflation-linked flat real income)
  const drawdownStrategy = params.drawdownStrategy === 'percentOfPot' ? 'percentOfPot' : 'flatReal';

  // Phase 2: Decumulation & Drawdown Simulation (first withdrawal in the retirement year, then retirementAge + 1 -> 100)
  const retirementTimeline = [];
  let currentDrawdownPotNominal = remainingPotNominal;
  let potDepletedAge = null;
  let cumulativeWithdrawalsNominal = lumpSumNominal;
  let cumulativeWithdrawalsReal = lumpSumReal;

  const initialWithdrawalReal = annualPotIncomeReal;

  // First-year withdrawal is taken from the pot during the retirement year (mid-year growth convention)
  const firstWithdrawalNominal = Math.min(annualPotIncomeNominal, remainingPotNominal * (1 + netGrowthRate / 2));
  const firstYearGain = (remainingPotNominal - firstWithdrawalNominal / 2) * netGrowthRate;
  currentDrawdownPotNominal = Math.max(0, remainingPotNominal - firstWithdrawalNominal + firstYearGain);
  if (remainingPotNominal > 0 && currentDrawdownPotNominal <= 0.01) {
    currentDrawdownPotNominal = 0;
    potDepletedAge = retirementAge;
  }
  cumulativeWithdrawalsNominal += firstWithdrawalNominal;
  cumulativeWithdrawalsReal += firstWithdrawalNominal / totalInflationDeflator;

  const retirementPointIndex = fullTimeline.length - 1;
  if (fullTimeline[retirementPointIndex]) {
    const rp = fullTimeline[retirementPointIndex];
    rp.potBeforeLumpSumNominal = finalPotNominal;
    rp.potBeforeLumpSumReal = finalPotReal;
    rp.potAfterLumpSumNominal = remainingPotNominal;
    rp.potAfterLumpSumReal = remainingPotReal;
    rp.closingPotNominal = currentDrawdownPotNominal;
    rp.closingPotReal = currentDrawdownPotNominal / totalInflationDeflator;
    rp.lumpSumTakenNominal = lumpSumNominal;
    rp.lumpSumTakenReal = lumpSumReal;
    rp.isRetirementTransition = true;
    rp.potDrawdownReal = annualPotIncomeReal;
    rp.potDrawdownNominal = annualPotIncomeNominal;
    rp.statePensionReal = isEligibleForStatePension ? annualStatePensionReal : 0;
    rp.statePensionNominal = isEligibleForStatePension ? annualStatePensionNominal : 0;
    rp.statePensionActive = isEligibleForStatePension;
    rp.totalSalaryReal = annualPotIncomeReal + (isEligibleForStatePension ? annualStatePensionReal : 0);
    rp.totalSalaryNominal = annualPotIncomeNominal + (isEligibleForStatePension ? annualStatePensionNominal : 0);
    rp.totalIncomeReal = rp.totalSalaryReal;
    rp.totalIncomeNominal = rp.totalSalaryNominal;
    rp.incomeTaxNominal = retireTax.taxNominal;
    rp.incomeTaxReal = retireTax.taxNominal / totalInflationDeflator;
    rp.netIncomeNominal = retireTax.netNominal;
    rp.netIncomeReal = retireTax.netReal;
    rp.effectiveTaxRate = rp.totalIncomeNominal > 0 ? (retireTax.taxNominal / rp.totalIncomeNominal) * 100 : 0;
    rp.cumulativeWithdrawalsNominal = cumulativeWithdrawalsNominal;
    rp.cumulativeWithdrawalsReal = cumulativeWithdrawalsReal;
    rp.isPotDepleted = currentDrawdownPotNominal <= 0;
    rp.privateDropPercent = 0;
  }

  for (let age = retirementAge + 1; age <= maxAge; age++) {
    const totalYear = age - currentAge;
    const inflationFactor = Math.pow(1 + inflationRate, totalYear);
    const startPot = currentDrawdownPotNominal;

    let actualWithdrawalNominal = 0;
    let investmentGain = 0;

    if (startPot > 0) {
      if (drawdownStrategy === 'percentOfPot') {
        // Percentage of Pot: withdraw fixed % of current pot each year
        // In real terms, this decreases over time as real pot decreases
        actualWithdrawalNominal = startPot * drawdownRate;
        investmentGain = (startPot - actualWithdrawalNominal / 2) * netGrowthRate;
        currentDrawdownPotNominal = startPot - actualWithdrawalNominal + investmentGain;
      } else {
        // Flat Real Income (Bengen Rule): constant purchasing power until depletion
        const desiredWithdrawalNominal = initialWithdrawalReal * inflationFactor;
        const maxAvailable = startPot * (1 + netGrowthRate / 2); // pot incl. growth if fully drawn mid-year
        if (desiredWithdrawalNominal >= maxAvailable) {
          actualWithdrawalNominal = maxAvailable;
          investmentGain = maxAvailable - startPot;
          currentDrawdownPotNominal = 0;
        } else {
          actualWithdrawalNominal = desiredWithdrawalNominal;
          investmentGain = (startPot * netGrowthRate) - (actualWithdrawalNominal * (netGrowthRate / 2));
          currentDrawdownPotNominal = startPot - actualWithdrawalNominal + investmentGain;
        }
      }

      if (currentDrawdownPotNominal <= 0.01) {
        currentDrawdownPotNominal = 0;
        if (!potDepletedAge) potDepletedAge = age;
      }
    } else {
      if (!potDepletedAge) potDepletedAge = age - 1;
      currentDrawdownPotNominal = 0;
    }

    const actualWithdrawalReal = actualWithdrawalNominal / inflationFactor;
    cumulativeWithdrawalsNominal += actualWithdrawalNominal;
    cumulativeWithdrawalsReal += actualWithdrawalReal;

    const potReal = currentDrawdownPotNominal / inflationFactor;

    // Public State Pension under Triple-Lock
    const spNominal = baselineStatePension * inflationFactor;
    const spReal = baselineStatePension;
    const spActive = includeStatePension && (age >= statePensionAge);
    const yearTax = taxForYear(totalYear, actualWithdrawalNominal, spActive ? spNominal : 0);

    // Private pension income purchasing power drop from Year 1 of retirement
    const privateDropPercent = initialWithdrawalReal > 0 
      ? ((actualWithdrawalReal - initialWithdrawalReal) / initialWithdrawalReal) * 100 
      : 0;

    const point = {
      phase: 'retirement',
      year: totalYear,
      age,
      salary: 0,
      employeeContrib: 0,
      employerContrib: 0,
      workplaceContrib: 0,
      sippNetContrib: 0,
      sippHmrcRelief: 0,
      sippGrossContrib: 0,
      totalContrib: 0,
      investmentGain,
      closingPotNominal: currentDrawdownPotNominal,
      closingPotReal: potReal,
      // Private pot drawdown income
      potDrawdownNominal: actualWithdrawalNominal,
      potDrawdownReal: actualWithdrawalReal,
      // Public State Pension
      statePensionNominal: spNominal,
      statePensionReal: spReal,
      statePensionActive: spActive,
      // Combined Total Retirement Salary
      totalSalaryNominal: actualWithdrawalNominal + (spActive ? spNominal : 0),
      totalSalaryReal: actualWithdrawalReal + (spActive ? spReal : 0),
      totalIncomeNominal: actualWithdrawalNominal + (spActive ? spNominal : 0),
      totalIncomeReal: actualWithdrawalReal + (spActive ? spReal : 0),
      incomeTaxNominal: yearTax,
      incomeTaxReal: yearTax / inflationFactor,
      netIncomeNominal: actualWithdrawalNominal + (spActive ? spNominal : 0) - yearTax,
      netIncomeReal: actualWithdrawalReal + (spActive ? spReal : 0) - yearTax / inflationFactor,
      effectiveTaxRate: (actualWithdrawalNominal + (spActive ? spNominal : 0)) > 0
        ? (yearTax / (actualWithdrawalNominal + (spActive ? spNominal : 0))) * 100
        : 0,
      privateDropPercent,
      cumulativeWithdrawalsNominal,
      cumulativeWithdrawalsReal,
      cumulativeEmployeeNominal: cumulativeEmployeeContribNominal,
      cumulativeEmployerNominal: cumulativeEmployerContribNominal,
      cumulativeSippNetNominal,
      cumulativeSippHmrcReliefNominal,
      cumulativeSippGrossNominal: cumulativeSippNetNominal + cumulativeSippHmrcReliefNominal,
      inflationFactor,
      isPotDepleted: currentDrawdownPotNominal <= 0
    };

    retirementTimeline.push(point);
    fullTimeline.push(point);
  }

  const potAt100Point = fullTimeline[fullTimeline.length - 1];
  const potAt100Nominal = potAt100Point ? potAt100Point.closingPotNominal : 0;
  const potAt100Real = potAt100Point ? potAt100Point.closingPotReal : 0;

  let plsaCategory = 'Below Minimum';
  if (totalAnnualIncomeReal >= UK_DEFAULTS.PLSA_STANDARDS.comfortable) {
    plsaCategory = 'Comfortable';
  } else if (totalAnnualIncomeReal >= UK_DEFAULTS.PLSA_STANDARDS.moderate) {
    plsaCategory = 'Moderate';
  } else if (totalAnnualIncomeReal >= UK_DEFAULTS.PLSA_STANDARDS.minimum) {
    plsaCategory = 'Minimum';
  }

  const finalSalaryNominal = currentSalary;
  const finalSalaryReal = finalSalaryNominal / totalInflationDeflator;
  const replacementRate = finalSalaryReal > 0 ? (totalAnnualIncomeReal / finalSalaryReal) * 100 : 0;

  const totalContributionsNominal = initialPot + cumulativeEmployeeContribNominal + cumulativeEmployerContribNominal + (cumulativeSippNetNominal + cumulativeSippHmrcReliefNominal);
  const totalGrowthNominal = Math.max(0, finalPotNominal - totalContributionsNominal);

  return {
    inputs: {
      currentAge,
      retirementAge,
      maxAge,
      yearsToRetire,
      annualSalary: initialSalary,
      contributionType,
      employeeInput,
      annualSalaryIncrease: salaryIncreaseRate * 100,
      inflationRate: inflationRate * 100,
      nominalGrowthRate: nominalGrowthRate * 100,
      feeRate: feeRate * 100,
      netGrowthRate: netGrowthRate * 100,
      currentPot: initialPot,
      externalSippMonthlyNet,
      sippNetAnnual,
      sippHmrcReliefAnnual,
      sippGrossAnnual,
      sippSelfAssessmentReliefAnnual,
      userTaxBand,
      takeLumpSum,
      lumpSumPercent: lumpSumPercent * 100,
      drawdownRate: drawdownRate * 100,
      includeStatePension,
      statePensionAge,
      statePensionAnnual: baselineStatePension
    },
    summary: {
      yearsToRetire,
      finalSalaryNominal,
      finalSalaryReal,
      totalInflationDeflator,
      // Total Pot at Retirement (Pre-Lump Sum)
      potNominal: finalPotNominal,
      potReal: finalPotReal,
      // 25% Lump Sum
      lumpSumNominal,
      lumpSumReal,
      lumpSumCapped: (finalPotNominal * lumpSumPercent) > UK_DEFAULTS.LUMP_SUM_ALLOWANCE_LIMIT,
      // Remaining Pot for Drawdown
      remainingPotNominal,
      remainingPotReal,
      // Pot Drawdown Income at Retirement
      potIncomeAnnualNominal: annualPotIncomeNominal,
      potIncomeMonthlyNominal: monthlyPotIncomeNominal,
      potIncomeAnnualReal: annualPotIncomeReal,
      potIncomeMonthlyReal: monthlyPotIncomeReal,
      // State Pension
      statePensionAnnualNominal: annualStatePensionNominal,
      statePensionMonthlyNominal: monthlyStatePensionNominal,
      statePensionAnnualReal: annualStatePensionReal,
      statePensionMonthlyReal: monthlyStatePensionReal,
      isEligibleForStatePension,
      // Monthly Breakdown (Private vs Public)
      privateIncomeMonthlyReal,
      privateIncomeMonthlyNominal: monthlyPotIncomeNominal,
      publicIncomeMonthlyReal,
      publicIncomeMonthlyNominal: monthlyStatePensionNominal,
      privateSharePercent,
      publicSharePercent,
      // Combined Gross Income at retirement
      totalAnnualIncomeNominal,
      totalMonthlyIncomeNominal,
      totalAnnualIncomeReal,
      totalMonthlyIncomeReal,
      // After-tax income at retirement (UK income tax, rUK bands)
      incomeTaxAnnualNominal: retireTax.taxNominal,
      incomeTaxMonthlyNominal: retireTax.taxNominal / 12,
      incomeTaxAnnualReal: retireTax.taxNominal / totalInflationDeflator,
      incomeTaxMonthlyReal: (retireTax.taxNominal / totalInflationDeflator) / 12,
      effectiveTaxRate: totalAnnualIncomeNominal > 0 ? (retireTax.taxNominal / totalAnnualIncomeNominal) * 100 : 0,

      netAnnualIncomeNominal: retireTax.netNominal,
      netMonthlyIncomeNominal: retireTax.netNominal / 12,
      netAnnualIncomeReal: retireTax.netReal,
      netMonthlyIncomeReal: retireTax.netReal / 12,

      // Full Combined (once State Pension commences)
      fullCombinedAnnualNominal,
      fullCombinedMonthlyNominal,
      fullCombinedAnnualReal,
      fullCombinedMonthlyReal,
      fullCombinedIncomeTaxAnnualNominal: fullCombinedTax.taxNominal,
      fullCombinedIncomeTaxMonthlyNominal: fullCombinedTax.taxNominal / 12,
      fullCombinedIncomeTaxAnnualReal: fullCombinedTax.taxNominal / Math.pow(1 + inflationRate, spStartYear),
      fullCombinedIncomeTaxMonthlyReal: (fullCombinedTax.taxNominal / Math.pow(1 + inflationRate, spStartYear)) / 12,
      fullCombinedEffectiveTaxRate: fullCombinedAnnualNominal > 0 ? (fullCombinedTax.taxNominal / fullCombinedAnnualNominal) * 100 : 0,
      fullCombinedNetAnnualNominal: fullCombinedTax.netNominal,
      fullCombinedNetMonthlyNominal: fullCombinedTax.netNominal / 12,
      fullCombinedNetAnnualReal: fullCombinedTax.netReal,
      fullCombinedNetMonthlyReal: fullCombinedTax.netReal / 12,

      privateTaxableFraction,
      // Contribution limit warnings (first age each limit was hit, or null)
      contributionWarnings,
      // External SIPP Contributions Summary
      externalSippMonthlyNet,
      sippNetAnnual,
      sippHmrcReliefAnnual,
      sippGrossAnnual,
      sippSelfAssessmentReliefAnnual,
      cumulativeSippNetNominal,
      cumulativeSippHmrcReliefNominal,
      cumulativeSippGrossNominal: cumulativeSippNetNominal + cumulativeSippHmrcReliefNominal,
      // Drawdown until Age 100
      potDepletedAge,
      potAt100Nominal,
      potAt100Real,
      cumulativeWithdrawalsNominal,
      cumulativeWithdrawalsReal,
      // Analysis
      replacementRate,
      plsaCategory,
      totalContributionsNominal,
      totalGrowthNominal
    },
    timeline: fullTimeline,
    accumulationTimeline,
    retirementTimeline
  };
}
