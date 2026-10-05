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
  CURRENT_FULL_STATE_PENSION_ANNUAL: 11973.0, // 2025/2026 full new state pension (£230.25/week * 52)
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
  }
};

/**
 * Calculates pension forecast including external SIPP and drawdown until age 100
 * @param {Object} params
 * @param {number} [params.externalSippMonthlyNet=0] - Monthly net £ contributed to separate SIPP
 * @param {'basic'|'higher'|'additional'} [params.taxBand='basic'] - Tax band for relief calculation
 */
export function calculatePensionForecast(params) {
  const currentAge = Math.max(18, Math.min(75, Number(params.currentAge) || 30));
  const retirementAge = Math.max(currentAge + 1, Math.min(80, Number(params.retirementAge) || 67));
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
  const lumpSumPercent = takeLumpSum ? Math.min(25, Math.max(0, Number(params.lumpSumPercent) || 25)) / 100 : 0;
  const drawdownRate = (Number(params.drawdownRate) || 4.0) / 100;

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
      employeeAnnualContrib = employeeInput * 12;
    }

    const employerAnnualContrib = currentSalary * employerPercent;
    const workplaceAnnualContrib = employeeAnnualContrib + employerAnnualContrib;

    // Total new contributions this year including SIPP gross (net + HMRC relief)
    const totalAnnualContrib = workplaceAnnualContrib + sippGrossAnnual;

    const investmentGain = (startPot * netGrowthRate) + (totalAnnualContrib * (netGrowthRate / 2));
    potNominal = startPot + totalAnnualContrib + investmentGain;

    cumulativeEmployeeContribNominal += employeeAnnualContrib;
    cumulativeEmployerContribNominal += employerAnnualContrib;
    cumulativeSippNetNominal += sippNetAnnual;
    cumulativeSippHmrcReliefNominal += sippHmrcReliefAnnual;
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
      sippNetContrib: sippNetAnnual,
      sippHmrcRelief: sippHmrcReliefAnnual,
      sippGrossContrib: sippGrossAnnual,
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
      cumulativeGrowthNominal: cumulativeGrowthNominal + (initialPot * (Math.pow(1 + netGrowthRate, year) - 1)),
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
    const spDeflator = Math.pow(1 + inflationRate, Math.max(0, statePensionAge - currentAge));
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

  // Drawdown Strategy: 'percentOfPot' (withdraw fixed % of remaining pot each year) or 'flatReal' (inflation-linked flat real income)
  const drawdownStrategy = params.drawdownStrategy === 'percentOfPot' ? 'percentOfPot' : 'flatReal';

  // Phase 2: Decumulation & Drawdown Simulation (retirementAge + 1 -> 100)
  const retirementTimeline = [];
  let currentDrawdownPotNominal = remainingPotNominal;
  let potDepletedAge = null;
  let cumulativeWithdrawalsNominal = lumpSumNominal;
  let cumulativeWithdrawalsReal = lumpSumReal;

  const initialWithdrawalReal = annualPotIncomeReal;

  const retirementPointIndex = fullTimeline.length - 1;
  if (fullTimeline[retirementPointIndex]) {
    fullTimeline[retirementPointIndex].potBeforeLumpSumNominal = finalPotNominal;
    fullTimeline[retirementPointIndex].potBeforeLumpSumReal = finalPotReal;
    fullTimeline[retirementPointIndex].closingPotNominal = remainingPotNominal;
    fullTimeline[retirementPointIndex].closingPotReal = remainingPotReal;
    fullTimeline[retirementPointIndex].lumpSumTakenNominal = lumpSumNominal;
    fullTimeline[retirementPointIndex].lumpSumTakenReal = lumpSumReal;
    fullTimeline[retirementPointIndex].isRetirementTransition = true;
    fullTimeline[retirementPointIndex].potDrawdownReal = annualPotIncomeReal;
    fullTimeline[retirementPointIndex].potDrawdownNominal = annualPotIncomeNominal;
    fullTimeline[retirementPointIndex].totalSalaryReal = annualPotIncomeReal + (isEligibleForStatePension ? annualStatePensionReal : 0);
    fullTimeline[retirementPointIndex].totalSalaryNominal = annualPotIncomeNominal + (isEligibleForStatePension ? annualStatePensionNominal : 0);
    fullTimeline[retirementPointIndex].privateDropPercent = 0;
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
        actualWithdrawalNominal = Math.min(startPot, desiredWithdrawalNominal);
        investmentGain = (startPot * netGrowthRate) - (actualWithdrawalNominal * (netGrowthRate / 2));
        currentDrawdownPotNominal = startPot - actualWithdrawalNominal + investmentGain;
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
      // Combined Income at retirement
      totalAnnualIncomeNominal,
      totalMonthlyIncomeNominal,
      totalAnnualIncomeReal,
      totalMonthlyIncomeReal,
      // Full Combined (once state pension commences)
      fullCombinedAnnualNominal,
      fullCombinedMonthlyNominal,
      fullCombinedAnnualReal,
      fullCombinedMonthlyReal,
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
