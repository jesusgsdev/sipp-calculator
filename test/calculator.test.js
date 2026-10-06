import assert from 'node:assert/strict';
import { calculatePensionForecast, calculateIncomeTax, UK_DEFAULTS } from '../js/calculator.js';

console.log('--- Running UK Pension Calculator Test Suite ---');

// Test 1: Standard projection with % of salary
{
  const res = calculatePensionForecast({
    currentAge: 30,
    retirementAge: 67,
    annualSalary: 50000,
    contributionType: 'percent',
    employeeContribution: 5,
    employerContributionPercent: 3,
    annualSalaryIncrease: 3,
    inflationRate: 2.5,
    currentPot: 20000,
    investmentGrowthRate: 6.0,
    feeRate: 0.5,
    takeLumpSum: true,
    lumpSumPercent: 25,
    drawdownRate: 4.0,
    includeStatePension: true,
    statePensionAge: 67
  });

  assert.equal(res.summary.yearsToRetire, 37, 'Years to retire should be 37');
  assert.ok(res.summary.potNominal > 500000, 'Nominal pot should exceed 500k');
  assert.ok(res.summary.potReal < res.summary.potNominal, 'Real pot must be deflated by inflation');
  assert.ok(Math.abs(res.summary.lumpSumNominal - (res.summary.potNominal * 0.25)) < 1 || res.summary.lumpSumCapped, 'Lump sum is 25% or capped');
  assert.ok(res.summary.remainingPotNominal + res.summary.lumpSumNominal - res.summary.potNominal < 0.01, 'Remaining + Lump sum equals total pot');
  
  // Real State Pension should equal baseline because of triple-lock inflation match
  assert.ok(Math.abs(res.summary.statePensionAnnualReal - UK_DEFAULTS.CURRENT_FULL_STATE_PENSION_ANNUAL) < 0.01, 'Triple lock keeps real state pension constant');
  
  // Nominal state pension must be deflated exactly by inflation factor
  const deflator = Math.pow(1.025, 37);
  assert.ok(Math.abs((res.summary.statePensionAnnualNominal / deflator) - res.summary.statePensionAnnualReal) < 0.01, 'Nominal SP discounted by inflation equals Real SP');

  console.log('✓ Test 1 passed: Standard % contribution projection');
}

// Test 2: Fixed monthly amount input (£)
{
  const res = calculatePensionForecast({
    currentAge: 40,
    retirementAge: 65,
    annualSalary: 60000,
    contributionType: 'amount',
    employeeContribution: 300, // £300/month
    employerContributionPercent: 0,
    annualSalaryIncrease: 2,
    inflationRate: 2.0,
    currentPot: 50000,
    investmentGrowthRate: 5.0,
    feeRate: 0.5,
    takeLumpSum: false, // 0% lump sum
    drawdownRate: 4.0,
    includeStatePension: true,
    statePensionAge: 67
  });

  assert.equal(res.summary.yearsToRetire, 25);
  assert.equal(res.summary.lumpSumNominal, 0, 'No lump sum when takeLumpSum is false');
  assert.equal(res.summary.remainingPotNominal, res.summary.potNominal, 'Remaining pot equals total pot');
  assert.equal(res.summary.isEligibleForStatePension, false, 'Retired at 65 before state pension age 67');
  assert.equal(res.summary.totalAnnualIncomeNominal, res.summary.potIncomeAnnualNominal, 'At 65, only pot income is counted in immediate total');
  assert.ok(res.summary.fullCombinedAnnualNominal > res.summary.totalAnnualIncomeNominal, 'Full combined includes future state pension');

  console.log('✓ Test 2 passed: Fixed monthly amount & early retirement before State Pension age');
}

// Test 3: UK Lump Sum Allowance Cap (£268,275)
{
  const res = calculatePensionForecast({
    currentAge: 50,
    retirementAge: 60,
    annualSalary: 100000,
    contributionType: 'percent',
    employeeContribution: 10,
    employerContributionPercent: 10,
    annualSalaryIncrease: 0,
    inflationRate: 2.0,
    currentPot: 1500000, // Very large existing pot
    investmentGrowthRate: 7.0,
    feeRate: 0.0,
    takeLumpSum: true,
    lumpSumPercent: 25,
    drawdownRate: 4.0,
    includeStatePension: false
  });

  assert.ok(res.summary.potNominal > 2000000, 'Pot exceeds £2m');
  assert.equal(res.summary.lumpSumNominal, UK_DEFAULTS.LUMP_SUM_ALLOWANCE_LIMIT, 'Lump sum must be capped at UK £268,275');
  assert.equal(res.summary.lumpSumCapped, true, 'Lump sum capped flag should be true');

  console.log('✓ Test 3 passed: UK statutory Lump Sum Allowance limit correctly enforced');
}

// Test 4: Triple lock inflation parity check
{
  const inflation = 3.5;
  const res = calculatePensionForecast({
    currentAge: 25,
    retirementAge: 68,
    annualSalary: 35000,
    contributionType: 'percent',
    employeeContribution: 5,
    employerContributionPercent: 3,
    inflationRate: inflation,
    includeStatePension: true,
    statePensionAge: 68
  });

  const years = 68 - 25;
  const deflator = Math.pow(1 + inflation / 100, years);
  const expectedNominalSP = UK_DEFAULTS.CURRENT_FULL_STATE_PENSION_ANNUAL * deflator;
  assert.ok(Math.abs(res.summary.statePensionAnnualNominal - expectedNominalSP) < 0.1, 'Nominal SP matches inflation compounding');
  assert.ok(Math.abs(res.summary.statePensionAnnualReal - UK_DEFAULTS.CURRENT_FULL_STATE_PENSION_ANNUAL) < 0.1, 'Real SP equals today full new state pension');

  console.log('✓ Test 4 passed: Triple-lock parity verified');
}

// Test 5: Drawdown trajectory until age 100
{
  const res = calculatePensionForecast({
    currentAge: 30,
    retirementAge: 65,
    annualSalary: 50000,
    contributionType: 'percent',
    employeeContribution: 5,
    employerContributionPercent: 3,
    inflationRate: 2.5,
    investmentGrowthRate: 6.0,
    feeRate: 0.5,
    drawdownRate: 4.0,
    takeLumpSum: true,
    lumpSumPercent: 25
  });

  // Verify timeline reaches age 100
  const finalPoint = res.timeline[res.timeline.length - 1];
  assert.equal(finalPoint.age, 100, 'Timeline must run until age 100');
  assert.equal(res.timeline[0].age, 31, 'Timeline starts at currentAge + 1');
  assert.equal(res.timeline.length, 70, '70 years total (age 31 to 100)');

  // Verify pot drawdown is modeled post retirement
  const retirePoint = res.timeline.find(d => d.age === 65);
  const postRetirePoint = res.timeline.find(d => d.age === 66);
  assert.ok(Math.abs(retirePoint.potAfterLumpSumNominal - res.summary.remainingPotNominal) < 1, 'Post-lump sum pot reflected at retirement');
  assert.ok(postRetirePoint.potDrawdownNominal > 0, 'Drawdown withdrawal is active in retirement');

  console.log('✓ Test 5 passed: Full lifetime trajectory to age 100 verified');
}

// Test 6: Pot depletion detection with high withdrawal rate
{
  const res = calculatePensionForecast({
    currentAge: 50,
    retirementAge: 60,
    annualSalary: 40000,
    currentPot: 50000,
    contributionType: 'percent',
    employeeContribution: 5,
    employerContributionPercent: 3,
    drawdownRate: 12.0, // Aggressive 12% drawdown causes rapid depletion
    investmentGrowthRate: 4.0,
    feeRate: 0.5,
    inflationRate: 3.0
  });

  assert.ok(res.summary.potDepletedAge !== null, 'High withdrawal rate must trigger pot depletion');
  assert.ok(res.summary.potDepletedAge < 100, `Pot depleted before 100 (depleted at ${res.summary.potDepletedAge})`);
  assert.equal(res.summary.potAt100Nominal, 0, 'Pot at age 100 is 0');

  console.log(`✓ Test 6 passed: High drawdown depletion detected at age ${res.summary.potDepletedAge}`);
}

// Test 7: External personal SIPP with HMRC Basic Rate Tax Relief (+25% top up)
{
  const netMonthly = 200;
  const res = calculatePensionForecast({
    currentAge: 30,
    retirementAge: 65,
    annualSalary: 50000,
    contributionType: 'percent',
    employeeContribution: 5,
    employerContributionPercent: 3,
    externalSippMonthlyNet: netMonthly, // £200 net/mo
    taxBand: 'basic'
  });

  const expectedNetAnnual = 200 * 12; // £2,400
  const expectedHmrcRelief = 2400 * 0.25; // £600
  const expectedGrossAnnual = 3000; // £3,000

  assert.equal(res.summary.sippNetAnnual, expectedNetAnnual, 'SIPP net annual should be £2,400');
  assert.equal(res.summary.sippHmrcReliefAnnual, expectedHmrcRelief, 'HMRC relief should be +25% (£600)');
  assert.equal(res.summary.sippGrossAnnual, expectedGrossAnnual, 'SIPP gross annual should be £3,000');
  assert.ok(res.timeline[0].sippGrossContrib === 3000, 'Timeline reflects gross SIPP contribution');

  console.log('✓ Test 7 passed: Personal SIPP HMRC basic rate tax relief (+25% top-up) verified');
}

// Test 8: Monthly income private vs public breakdown
{
  const res = calculatePensionForecast({
    currentAge: 30,
    retirementAge: 67,
    annualSalary: 50000,
    contributionType: 'percent',
    employeeContribution: 5,
    employerContributionPercent: 3,
    drawdownRate: 4.0,
    includeStatePension: true,
    statePensionAge: 67
  });

  assert.ok(res.summary.privateIncomeMonthlyReal > 0, 'Private income > 0');
  assert.ok(res.summary.publicIncomeMonthlyReal > 0, 'Public income > 0');
  const sumMonthly = res.summary.privateIncomeMonthlyReal + res.summary.publicIncomeMonthlyReal;
  assert.ok(Math.abs(sumMonthly - res.summary.totalMonthlyIncomeReal) < 0.01, 'Private + Public equals Total Combined Monthly');
  assert.ok(Math.abs((res.summary.privateSharePercent + res.summary.publicSharePercent) - 100) < 0.01, 'Shares sum to 100%');

  console.log('✓ Test 8 passed: Monthly private vs public pension breakdown verified');
}

// Test 9: Purchasing power trajectory under percentage drawdown vs Triple-Lock State Pension
{
  const res = calculatePensionForecast({
    currentAge: 35,
    retirementAge: 65,
    annualSalary: 60000,
    contributionType: 'percent',
    employeeContribution: 6,
    employerContributionPercent: 4,
    drawdownRate: 4.0,
    drawdownStrategy: 'percentOfPot',
    investmentGrowthRate: 5.5,
    feeRate: 0.5,
    inflationRate: 2.5,
    includeStatePension: true,
    statePensionAge: 67
  });

  const retireYears = res.timeline.filter(d => d.age >= 65);
  assert.ok(retireYears.length > 0, 'Retirement points exist');

  // Verify private pot income in real terms decreases over time under 4% drawdown with net real return ~2.4%
  const firstYearPrivateReal = retireYears[0].potDrawdownReal;
  const tenthYearPrivateReal = retireYears[10].potDrawdownReal;
  assert.ok(tenthYearPrivateReal < firstYearPrivateReal, 'Private drawdown income in real terms decreases over time');

  // Verify State Pension purchasing power in real terms stays exactly flat once active (triple lock)
  const spPoints = retireYears.filter(d => d.age >= 67);
  const baselineSPReal = spPoints[0].statePensionReal;
  for (const pt of spPoints) {
    assert.equal(pt.statePensionReal, baselineSPReal, 'State Pension real purchasing power is 100% constant');
  }

  console.log('✓ Test 9 passed: Percentage drawdown real income decrease and triple-lock parity verified');
}

// Test 10: UK income tax bands (2026/27, rUK)
{
  assert.equal(calculateIncomeTax(12570), 0);
  assert.equal(calculateIncomeTax(50270), 7540);
  assert.equal(Math.round(calculateIncomeTax(60000)), 7540 + Math.round(9730 * 0.4));
  // £125,140: PA fully tapered -> 37700*0.2 + (125140-37700)*0.4
  assert.equal(Math.round(calculateIncomeTax(125140)), Math.round(7540 + 87440 * 0.4));
  console.log('✓ Test 10 passed: UK income tax bands and personal allowance taper verified');
}

// Test 11: Net income is below gross; drawdown fully taxable after upfront lump sum
{
  const res = calculatePensionForecast({ currentAge: 40, retirementAge: 67, annualSalary: 40000, contributionType: 'percent', employeeContribution: 5, employerContributionPercent: 3, inflationRate: 2.5, investmentGrowthRate: 6, feeRate: 0.5, takeLumpSum: true });
  const s = res.summary;
  assert.ok(s.netAnnualIncomeReal < s.totalAnnualIncomeReal, 'Net below gross');
  assert.equal(s.privateTaxableFraction, 1);
  const noLump = calculatePensionForecast({ currentAge: 40, retirementAge: 67, annualSalary: 40000, contributionType: 'percent', employeeContribution: 5, employerContributionPercent: 3, takeLumpSum: false });
  assert.equal(noLump.summary.privateTaxableFraction, 0.75);
  console.log('✓ Test 11 passed: Retirement income tax applied');
}

// Test 12: Fixed £ contributions rise with salary; SIPP contributions rise with inflation
{
  const res = calculatePensionForecast({ currentAge: 30, retirementAge: 40, annualSalary: 30000, annualSalaryIncrease: 3, inflationRate: 2, contributionType: 'amount', employeeContribution: 100, employerContributionPercent: 0, externalSippMonthlyNet: 100 });
  const t = res.accumulationTimeline;
  assert.ok(Math.abs(t[1].employeeContrib - 1200 * 1.03) < 1e-6);
  assert.ok(Math.abs(t[1].sippGrossContrib - 1500 * 1.02) < 1e-6);
  console.log('✓ Test 12 passed: Contributions indexed');
}

// Test 13: HMRC 100% of earnings relief cap and £60k Annual Allowance
{
  const low = calculatePensionForecast({ currentAge: 30, retirementAge: 35, annualSalary: 10000, annualSalaryIncrease: 0, inflationRate: 0, employeeContribution: 0, employerContributionPercent: 0, externalSippMonthlyNet: 2000 });
  assert.ok(Math.abs(low.accumulationTimeline[0].sippGrossContrib - 10000) < 1e-6, 'SIPP gross capped at salary');
  assert.ok(low.summary.contributionWarnings.reliefCapAge);
  const high = calculatePensionForecast({ currentAge: 30, retirementAge: 35, annualSalary: 200000, annualSalaryIncrease: 0, inflationRate: 0, employeeContribution: 10, employerContributionPercent: 10, externalSippMonthlyNet: 3000 });
  const p = high.accumulationTimeline[0];
  assert.ok(Math.abs(p.workplaceContrib + p.sippGrossContrib - 60000) < 1e-6, 'Total capped at AA');
  assert.ok(high.summary.contributionWarnings.annualAllowanceAge);
  console.log('✓ Test 13 passed: Relief cap and Annual Allowance enforced');
}

// Test 14: Retirement-year withdrawal is deducted from the pot
{
  const res = calculatePensionForecast({ currentAge: 60, retirementAge: 65, annualSalary: 50000, employeeContribution: 5, employerContributionPercent: 5, investmentGrowthRate: 0, feeRate: 0, inflationRate: 0, drawdownRate: 4 });
  const rp = res.timeline.find(d => d.isRetirementTransition);
  assert.ok(Math.abs(rp.closingPotNominal - res.summary.remainingPotNominal * 0.96) < 1e-6);
  console.log('✓ Test 14 passed: First-year withdrawal deducted');
}

console.log('ALL TESTS PASSED SUCCESSFULLY! 🎉');


