/**
 * Application Controller & Reactive UI Binding for UK Pension Forecaster
 * Supports:
 * - Lifetime modeling to Age 100 including decumulation and drawdown
 * - External Personal SIPP with HMRC Basic Rate Tax Relief (+25% top up)
 * - Monthly Breakdown: Private Pot Drawdown vs UK Public State Pension
 * - Public State Pension Triple-Lock growth trajectory on chart
 */

import { calculatePensionForecast, UK_DEFAULTS } from './calculator.js';
import { renderGrowthChart, renderIncomeComparisonChart, renderPurchasingPowerIncomeChart } from './charts.js';

// Application State
const state = {
  currentAge: 30,
  retirementAge: 67,
  currentPot: 20000,
  annualSalary: 45000,
  contributionType: 'percent', // 'percent' or 'amount'
  contribPercent: 5.0,
  contribAmount: 188, // Monthly £
  salaryIncrease: 3.0,
  employerPercent: 3.0,
  externalSippMonthlyNet: 200, // Monthly net £ contributed to separate SIPP
  userTaxBand: 'basic', // 'basic', 'higher', 'additional'
  inflationRate: 2.5,
  growthRate: 6.0,
  feeRate: 0.5,
  takeLumpSum: true,
  lumpSumPercent: 25,
  drawdownRate: 4.0,
  drawdownStrategy: 'percentOfPot', // 'percentOfPot' or 'flatReal'
  includeStatePension: true,
  statePensionAnnual: UK_DEFAULTS.CURRENT_FULL_STATE_PENSION_ANNUAL,
  statePensionAge: UK_DEFAULTS.DEFAULT_STATE_PENSION_AGE,
  
  // View preferences
  frequency: 'monthly', // 'monthly' or 'annual'
  viewMode: 'sidebyside', // 'sidebyside', 'real', 'nominal'
  scheduleFilter: 'all' // 'all', 'accum', 'draw'
};

// Formatter Helpers
function formatGBP(val, decimals = 0) {
  if (isNaN(val) || val === null || val === undefined) return '£0';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  }).format(val);
}

// DOM Elements
const elements = {
  // Personal
  currentAge: document.getElementById('currentAge'),
  currentAgeNum: document.getElementById('currentAge-num'),
  valCurrentAge: document.getElementById('val-currentAge'),
  retirementAge: document.getElementById('retirementAge'),
  retirementAgeNum: document.getElementById('retirementAge-num'),
  valRetirementAge: document.getElementById('val-retirementAge'),
  yearsToRetireText: document.getElementById('years-to-retire-text'),
  currentPot: document.getElementById('currentPot'),

  // Salary & Workplace Contribs
  annualSalary: document.getElementById('annualSalary'),
  btnModePercent: document.getElementById('btn-mode-percent'),
  btnModeAmount: document.getElementById('btn-mode-amount'),
  groupContribPercent: document.getElementById('group-contrib-percent'),
  groupContribAmount: document.getElementById('group-contrib-amount'),
  contribPercent: document.getElementById('contribPercent'),
  contribPercentNum: document.getElementById('contribPercent-num'),
  valContribPercent: document.getElementById('val-contribPercent'),
  equivMonthlyText: document.getElementById('equiv-monthly-text'),
  contribAmount: document.getElementById('contribAmount'),
  equivPercentText: document.getElementById('equiv-percent-text'),
  salaryIncrease: document.getElementById('salaryIncrease'),
  salaryIncreaseNum: document.getElementById('salaryIncrease-num'),
  valSalaryIncrease: document.getElementById('val-salaryIncrease'),
  employerPercent: document.getElementById('employerPercent'),
  employerPercentNum: document.getElementById('employerPercent-num'),
  valEmployerPercent: document.getElementById('val-employerPercent'),

  // External SIPP & Tax Relief
  externalSippMonthlyNet: document.getElementById('externalSippMonthlyNet'),
  externalSippMonthlyNetNum: document.getElementById('externalSippMonthlyNet-num'),
  valExternalSippNet: document.getElementById('val-externalSippNet'),
  sippNetLabel: document.getElementById('sipp-net-label'),
  sippHmrcLabel: document.getElementById('sipp-hmrc-label'),
  sippGrossLabel: document.getElementById('sipp-gross-label'),
  userTaxBand: document.getElementById('userTaxBand'),
  sippExtraReliefText: document.getElementById('sipp-extra-relief-text'),

  // Market & Inflation
  inflationRate: document.getElementById('inflationRate'),
  inflationRateNum: document.getElementById('inflationRate-num'),
  valInflationRate: document.getElementById('val-inflationRate'),
  growthRate: document.getElementById('growthRate'),
  growthRateNum: document.getElementById('growthRate-num'),
  valGrowthRate: document.getElementById('val-growthRate'),
  feeRate: document.getElementById('feeRate'),
  feeRateNum: document.getElementById('feeRate-num'),
  valFeeRate: document.getElementById('val-feeRate'),
  netRealReturnTag: document.getElementById('net-real-return-tag'),

  // Drawdown & State Pension
  takeLumpSum: document.getElementById('takeLumpSum'),
  lumpSumSliderWrap: document.getElementById('lump-sum-slider-wrap'),
  lumpSumPercent: document.getElementById('lumpSumPercent'),
  lumpSumPercentNum: document.getElementById('lumpSumPercent-num'),
  valLumpSumPercent: document.getElementById('val-lumpSumPercent'),
  drawdownRate: document.getElementById('drawdownRate'),
  drawdownRateNum: document.getElementById('drawdownRate-num'),
  valDrawdownRate: document.getElementById('val-drawdownRate'),
  includeStatePension: document.getElementById('includeStatePension'),
  statePensionWrap: document.getElementById('state-pension-wrap'),
  statePensionAnnual: document.getElementById('statePensionAnnual'),
  statePensionAge: document.getElementById('statePensionAge'),
  statePensionAgeNum: document.getElementById('statePensionAge-num'),
  valStatePensionAge: document.getElementById('val-statePensionAge'),

  // Toolbar
  btnFreqMonthly: document.getElementById('btn-freq-monthly'),
  btnFreqAnnual: document.getElementById('btn-freq-annual'),
  btnModeSideBySide: document.getElementById('btn-mode-sidebyside'),
  btnModeReal: document.getElementById('btn-mode-real'),
  btnModeNominal: document.getElementById('btn-mode-nominal'),

  // Results Hero
  heroIncomeMain: document.getElementById('hero-income-main'),
  heroIncomeSub: document.getElementById('hero-income-sub'),
  heroIncomeNominal: document.getElementById('hero-income-nominal'),
  heroInflationNote: document.getElementById('hero-inflation-note'),
  // Monthly Breakdown (Private vs Public)
  heroSplitPrivateReal: document.getElementById('hero-split-private-real'),
  heroSplitPrivateNom: document.getElementById('hero-split-private-nom'),
  heroSplitPrivateShare: document.getElementById('hero-split-private-share'),
  heroSplitPublicReal: document.getElementById('hero-split-public-real'),
  heroSplitPublicNom: document.getElementById('hero-split-public-nom'),
  heroSplitPublicShare: document.getElementById('hero-split-public-share'),
  // PLSA
  plsaBadge: document.getElementById('plsa-badge'),
  plsaProgressBar: document.getElementById('plsa-progress-bar'),

  // Results Cards
  metricPotReal: document.getElementById('metric-pot-real'),
  metricPotNominal: document.getElementById('metric-pot-nominal'),
  metricLumpReal: document.getElementById('metric-lump-real'),
  metricLumpNominal: document.getElementById('metric-lump-nominal'),
  lumpCappedNote: document.getElementById('lump-capped-note'),
  metricRemReal: document.getElementById('metric-rem-real'),
  metricRemNominal: document.getElementById('metric-rem-nominal'),
  metricPotIncReal: document.getElementById('metric-potinc-real'),
  metricPotIncNominal: document.getElementById('metric-potinc-nominal'),
  metricSpReal: document.getElementById('metric-sp-real'),
  metricSpNominal: document.getElementById('metric-sp-nominal'),
  metricReplacementRate: document.getElementById('metric-replacement-rate'),
  metricFinalSalary: document.getElementById('metric-final-salary'),
  metricAge100Real: document.getElementById('metric-age100-real'),
  metricAge100Nominal: document.getElementById('metric-age100-nominal'),
  metricAge100Status: document.getElementById('metric-age100-status'),

  // Charts
  chartGrowthContainer: document.getElementById('chart-growth-container'),
  chartGrowthTitle: document.getElementById('chart-growth-title'),
  chartIncomeContainer: document.getElementById('chart-income-container'),
  incomeChartSubtitle: document.getElementById('income-chart-subtitle'),
  chartPurchasingPowerContainer: document.getElementById('chart-purchasing-power-container'),
  purchasingPowerStartAge: document.getElementById('purchasing-power-start-age'),
  btnDrawStratPct: document.getElementById('btn-draw-strat-pct'),
  btnDrawStratFlat: document.getElementById('btn-draw-strat-flat'),
  explainerSpAmount: document.getElementById('explainer-sp-amount'),
  explainerDrawdownRate: document.getElementById('explainer-drawdown-rate'),
  explainerNetReal: document.getElementById('explainer-net-real'),

  // Tables
  comparisonMatrixBody: document.getElementById('comparison-matrix-body'),
  btnToggleSchedule: document.getElementById('btn-toggle-schedule'),
  scheduleToggleText: document.getElementById('schedule-toggle-text'),
  scheduleChevron: document.getElementById('schedule-chevron'),
  scheduleTableWrap: document.getElementById('schedule-table-wrap'),
  scheduleTableBody: document.getElementById('schedule-table-body'),
  btnSchedAll: document.getElementById('btn-sched-all'),
  btnSchedAccum: document.getElementById('btn-sched-accum'),
  btnSchedDraw: document.getElementById('btn-sched-draw'),

  // Header Actions
  btnExportCSV: document.getElementById('btn-export-csv'),
  btnPrint: document.getElementById('btn-print'),

  // Profile Management
  profileSelect: document.getElementById('profile-select'),
  profileStatusBadge: document.getElementById('profile-status-badge'),
  profileStatusText: document.getElementById('profile-status-text'),
  btnProfileSave: document.getElementById('btn-profile-save'),
  btnProfileSaveAs: document.getElementById('btn-profile-save-as'),
  btnProfileScratch: document.getElementById('btn-profile-scratch'),
  btnProfileDelete: document.getElementById('btn-profile-delete'),
  profileModalOverlay: document.getElementById('profile-modal-overlay'),
  profileModalForm: document.getElementById('profile-modal-form'),
  profileNameInput: document.getElementById('profile-name-input'),
  modalTitle: document.getElementById('modal-title'),
  modalError: document.getElementById('modal-error'),
  btnModalClose: document.getElementById('btn-modal-close'),
  btnModalCancel: document.getElementById('btn-modal-cancel'),
  profileToast: document.getElementById('profile-toast'),

  // Preset Buttons
  presetButtons: document.querySelectorAll('.preset-btn')
};

// Current forecast cache & Profile state
let currentForecast = null;
let currentProfileName = null;
let isProfileModified = false;

const PROFILES_STORAGE_KEY = 'uk_pension_profiles_v1';

// Clean baseline for 'Start from Scratch'
const SCRATCH_PROFILE = {
  currentAge: 30,
  retirementAge: 67,
  currentPot: 0,
  annualSalary: 40000,
  contributionType: 'percent',
  contribPercent: 5.0,
  contribAmount: 167,
  salaryIncrease: 2.5,
  employerPercent: 3.0,
  externalSippMonthlyNet: 0,
  userTaxBand: 'basic',
  inflationRate: 2.5,
  growthRate: 6.0,
  feeRate: 0.5,
  takeLumpSum: true,
  lumpSumPercent: 25,
  drawdownRate: 4.0,
  drawdownStrategy: 'percentOfPot',
  includeStatePension: true,
  statePensionAnnual: UK_DEFAULTS.CURRENT_FULL_STATE_PENSION_ANNUAL,
  statePensionAge: UK_DEFAULTS.DEFAULT_STATE_PENSION_AGE,
  frequency: 'monthly',
  viewMode: 'sidebyside'
};

// Initial starter profiles when localStorage is fresh
const DEFAULT_STARTER_PROFILES = {
  "Standard Auto-Enrolment": {
    currentAge: 30,
    retirementAge: 67,
    currentPot: 20000,
    annualSalary: 45000,
    contributionType: 'percent',
    contribPercent: 5.0,
    contribAmount: 188,
    salaryIncrease: 3.0,
    employerPercent: 3.0,
    externalSippMonthlyNet: 100,
    userTaxBand: 'basic',
    inflationRate: 2.5,
    growthRate: 6.0,
    feeRate: 0.5,
    takeLumpSum: true,
    lumpSumPercent: 25,
    drawdownRate: 4.0,
    drawdownStrategy: 'percentOfPot',
    includeStatePension: true,
    statePensionAnnual: 11973,
    statePensionAge: 67,
    frequency: 'monthly',
    viewMode: 'sidebyside'
  },
  "Early Retirement & SIPP Booster": {
    currentAge: 32,
    retirementAge: 58,
    currentPot: 50000,
    annualSalary: 75000,
    contributionType: 'percent',
    contribPercent: 12.0,
    contribAmount: 750,
    salaryIncrease: 3.0,
    employerPercent: 6.0,
    externalSippMonthlyNet: 400,
    userTaxBand: 'higher',
    inflationRate: 2.5,
    growthRate: 6.5,
    feeRate: 0.4,
    takeLumpSum: true,
    lumpSumPercent: 25,
    drawdownRate: 3.75,
    drawdownStrategy: 'percentOfPot',
    includeStatePension: true,
    statePensionAnnual: 11973,
    statePensionAge: 67,
    frequency: 'monthly',
    viewMode: 'sidebyside'
  }
};

function getAllProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(DEFAULT_STARTER_PROFILES));
      return { ...DEFAULT_STARTER_PROFILES };
    }
    return JSON.parse(raw) || {};
  } catch (err) {
    console.warn('Failed to read profiles from localStorage:', err);
    return {};
  }
}

function saveAllProfiles(profiles) {
  try {
    localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to save profiles to localStorage:', err);
  }
}

function showToast(message, duration = 2800) {
  if (!elements.profileToast) return;
  elements.profileToast.textContent = message;
  elements.profileToast.style.display = 'flex';
  clearTimeout(elements.profileToast._timer);
  elements.profileToast._timer = setTimeout(() => {
    elements.profileToast.style.display = 'none';
  }, duration);
}

function extractCurrentStateData() {
  return {
    currentAge: state.currentAge,
    retirementAge: state.retirementAge,
    currentPot: state.currentPot,
    annualSalary: state.annualSalary,
    contributionType: state.contributionType,
    contribPercent: state.contribPercent,
    contribAmount: state.contribAmount,
    salaryIncrease: state.salaryIncrease,
    employerPercent: state.employerPercent,
    externalSippMonthlyNet: state.externalSippMonthlyNet,
    userTaxBand: state.userTaxBand,
    inflationRate: state.inflationRate,
    growthRate: state.growthRate,
    feeRate: state.feeRate,
    takeLumpSum: state.takeLumpSum,
    lumpSumPercent: state.lumpSumPercent,
    drawdownRate: state.drawdownRate,
    drawdownStrategy: state.drawdownStrategy,
    includeStatePension: state.includeStatePension,
    statePensionAnnual: state.statePensionAnnual,
    statePensionAge: state.statePensionAge,
    frequency: state.frequency,
    viewMode: state.viewMode
  };
}

function applyDataToState(data) {
  Object.keys(data).forEach(key => {
    if (key in state) {
      state[key] = data[key];
    }
  });
  isProfileModified = false;
  syncAllInputElements();
  recalculate();
}

function refreshProfileDropdown() {
  if (!elements.profileSelect) return;
  const profiles = getAllProfiles();
  const names = Object.keys(profiles);

  elements.profileSelect.innerHTML = '';
  
  const scratchOpt = document.createElement('option');
  scratchOpt.value = '';
  scratchOpt.textContent = '-- Scratch / Unsaved --';
  elements.profileSelect.appendChild(scratchOpt);

  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    elements.profileSelect.appendChild(opt);
  });

  elements.profileSelect.value = currentProfileName || '';
  updateProfileBadge(isProfileModified);
}

function updateProfileBadge(modified = false) {
  if (!elements.profileStatusBadge || !elements.profileStatusText) return;
  if (currentProfileName) {
    if (modified) {
      elements.profileStatusText.textContent = `${currentProfileName} (Modified)`;
      elements.profileStatusBadge.className = 'active-profile-indicator unsaved';
    } else {
      elements.profileStatusText.textContent = currentProfileName;
      elements.profileStatusBadge.className = 'active-profile-indicator saved';
    }
    if (elements.btnProfileDelete) elements.btnProfileDelete.style.display = 'inline-flex';
  } else {
    elements.profileStatusText.textContent = 'Scratch / Unsaved';
    elements.profileStatusBadge.className = 'active-profile-indicator unsaved';
    if (elements.btnProfileDelete) elements.btnProfileDelete.style.display = 'none';
  }
}

let modalTargetMode = 'save'; // 'save' or 'saveAs'

function openProfileModal(mode = 'save') {
  modalTargetMode = mode;
  if (!elements.profileModalOverlay) return;
  elements.modalTitle.textContent = mode === 'saveAs' ? 'Save Profile As' : 'Save Profile';
  elements.profileNameInput.value = (mode === 'saveAs' && currentProfileName) ? `${currentProfileName} (Copy)` : (currentProfileName || '');
  elements.modalError.style.display = 'none';
  elements.modalError.textContent = '';
  elements.profileModalOverlay.style.display = 'flex';
  setTimeout(() => elements.profileNameInput.focus(), 60);
}

function closeProfileModal() {
  if (elements.profileModalOverlay) {
    elements.profileModalOverlay.style.display = 'none';
  }
}

function markProfileModified() {
  if (currentProfileName && !isProfileModified) {
    isProfileModified = true;
    updateProfileBadge(true);
  }
}

/**
 * Synchronize slider and number input pair
 */
function bindSliderAndNumber(slider, numInput, labelEl, stateKey, suffix = '%', minStepCheck = null) {
  if (!slider || !numInput) return;
  const syncValues = (val) => {
    let numeric = parseFloat(val);
    if (isNaN(numeric)) return;

    if (minStepCheck) {
      numeric = minStepCheck(numeric);
    }

    slider.value = numeric;
    numInput.value = numeric;
    if (labelEl) labelEl.textContent = `${numeric}${suffix}`;
    state[stateKey] = numeric;
    markProfileModified();
    recalculate();
  };

  slider.addEventListener('input', (e) => syncValues(e.target.value));
  numInput.addEventListener('change', (e) => syncValues(e.target.value));
}

/**
 * Setup Event Listeners
 */
function setupEventListeners() {
  // Ages
  bindSliderAndNumber(elements.currentAge, elements.currentAgeNum, elements.valCurrentAge, 'currentAge', ' yrs', (val) => {
    if (state.retirementAge <= val) {
      state.retirementAge = Math.min(80, val + 1);
      elements.retirementAge.value = state.retirementAge;
      elements.retirementAgeNum.value = state.retirementAge;
      elements.valRetirementAge.textContent = `${state.retirementAge} yrs`;
    }
    return val;
  });

  bindSliderAndNumber(elements.retirementAge, elements.retirementAgeNum, elements.valRetirementAge, 'retirementAge', ' yrs', (val) => {
    if (val <= state.currentAge) {
      val = state.currentAge + 1;
    }
    return val;
  });

  // Current Pot
  elements.currentPot.addEventListener('input', (e) => {
    state.currentPot = Math.max(0, parseFloat(e.target.value) || 0);
    markProfileModified();
    recalculate();
  });

  // Salary
  elements.annualSalary.addEventListener('input', (e) => {
    state.annualSalary = Math.max(0, parseFloat(e.target.value) || 0);
    markProfileModified();
    updateContributionHelpers();
    recalculate();
  });

  // Mode Toggle: % vs £ Monthly
  elements.btnModePercent.addEventListener('click', () => {
    state.contributionType = 'percent';
    elements.btnModePercent.classList.add('active');
    elements.btnModeAmount.classList.remove('active');
    elements.groupContribPercent.style.display = 'block';
    elements.groupContribAmount.style.display = 'none';
    markProfileModified();
    updateContributionHelpers();
    recalculate();
  });

  elements.btnModeAmount.addEventListener('click', () => {
    state.contributionType = 'amount';
    elements.btnModeAmount.classList.add('active');
    elements.btnModePercent.classList.remove('active');
    elements.groupContribPercent.style.display = 'none';
    elements.groupContribAmount.style.display = 'block';
    markProfileModified();
    updateContributionHelpers();
    recalculate();
  });

  // Contrib Percent
  bindSliderAndNumber(elements.contribPercent, elements.contribPercentNum, elements.valContribPercent, 'contribPercent', '%');
  elements.contribPercent.addEventListener('input', updateContributionHelpers);
  elements.contribPercentNum.addEventListener('change', updateContributionHelpers);

  // Contrib Amount
  elements.contribAmount.addEventListener('input', (e) => {
    state.contribAmount = Math.max(0, parseFloat(e.target.value) || 0);
    markProfileModified();
    updateContributionHelpers();
    recalculate();
  });

  // Salary Increase & Employer Contrib
  bindSliderAndNumber(elements.salaryIncrease, elements.salaryIncreaseNum, elements.valSalaryIncrease, 'salaryIncrease', '%');
  bindSliderAndNumber(elements.employerPercent, elements.employerPercentNum, elements.valEmployerPercent, 'employerPercent', '%');

  // External SIPP Monthly Net Contribution
  bindSliderAndNumber(elements.externalSippMonthlyNet, elements.externalSippMonthlyNetNum, elements.valExternalSippNet, 'externalSippMonthlyNet', '/mo');
  elements.externalSippMonthlyNet.addEventListener('input', updateSippTaxReliefHelpers);
  elements.externalSippMonthlyNetNum.addEventListener('change', updateSippTaxReliefHelpers);

  // Tax Band Select
  if (elements.userTaxBand) {
    elements.userTaxBand.addEventListener('change', (e) => {
      state.userTaxBand = e.target.value;
      markProfileModified();
      updateSippTaxReliefHelpers();
      recalculate();
    });
  }

  // Market & Inflation
  bindSliderAndNumber(elements.inflationRate, elements.inflationRateNum, elements.valInflationRate, 'inflationRate', '%');
  bindSliderAndNumber(elements.growthRate, elements.growthRateNum, elements.valGrowthRate, 'growthRate', '%');
  bindSliderAndNumber(elements.feeRate, elements.feeRateNum, elements.valFeeRate, 'feeRate', '%');

  // 25% Lump Sum
  elements.takeLumpSum.addEventListener('change', (e) => {
    state.takeLumpSum = e.target.checked;
    elements.lumpSumSliderWrap.style.display = state.takeLumpSum ? 'block' : 'none';
    markProfileModified();
    recalculate();
  });

  bindSliderAndNumber(elements.lumpSumPercent, elements.lumpSumPercentNum, elements.valLumpSumPercent, 'lumpSumPercent', '%');
  bindSliderAndNumber(elements.drawdownRate, elements.drawdownRateNum, elements.valDrawdownRate, 'drawdownRate', '%');

  // State Pension
  elements.includeStatePension.addEventListener('change', (e) => {
    state.includeStatePension = e.target.checked;
    elements.statePensionWrap.style.display = state.includeStatePension ? 'block' : 'none';
    markProfileModified();
    recalculate();
  });

  elements.statePensionAnnual.addEventListener('input', (e) => {
    state.statePensionAnnual = Math.max(0, parseFloat(e.target.value) || 0);
    markProfileModified();
    recalculate();
  });

  bindSliderAndNumber(elements.statePensionAge, elements.statePensionAgeNum, elements.valStatePensionAge, 'statePensionAge', ' yrs');

  // Drawdown Strategy Toggle (% of Remaining Pot vs Flat Real Income)
  if (elements.btnDrawStratPct) {
    elements.btnDrawStratPct.addEventListener('click', () => {
      state.drawdownStrategy = 'percentOfPot';
      elements.btnDrawStratPct.classList.add('active');
      elements.btnDrawStratFlat.classList.remove('active');
      markProfileModified();
      recalculate();
    });
  }
  if (elements.btnDrawStratFlat) {
    elements.btnDrawStratFlat.addEventListener('click', () => {
      state.drawdownStrategy = 'flatReal';
      elements.btnDrawStratFlat.classList.add('active');
      elements.btnDrawStratPct.classList.remove('active');
      markProfileModified();
      recalculate();
    });
  }

  // Frequency Toggle
  elements.btnFreqMonthly.addEventListener('click', () => {
    state.frequency = 'monthly';
    elements.btnFreqMonthly.classList.add('active');
    elements.btnFreqAnnual.classList.remove('active');
    updateResultsUI();
  });

  elements.btnFreqAnnual.addEventListener('click', () => {
    state.frequency = 'annual';
    elements.btnFreqAnnual.classList.add('active');
    elements.btnFreqMonthly.classList.remove('active');
    updateResultsUI();
  });

  // View Mode
  elements.btnModeSideBySide.addEventListener('click', () => setViewMode('sidebyside'));
  elements.btnModeReal.addEventListener('click', () => setViewMode('real'));
  elements.btnModeNominal.addEventListener('click', () => setViewMode('nominal'));

  // Toggle Schedule Table
  elements.btnToggleSchedule.addEventListener('click', () => {
    const isHidden = elements.scheduleTableWrap.style.display === 'none';
    elements.scheduleTableWrap.style.display = isHidden ? 'block' : 'none';
    elements.scheduleToggleText.textContent = isHidden ? 'Hide Full Table' : 'Show Full Table';
    elements.scheduleChevron.style.transform = isHidden ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  // Schedule Filters
  if (elements.btnSchedAll) {
    elements.btnSchedAll.addEventListener('click', () => setScheduleFilter('all'));
  }
  if (elements.btnSchedAccum) {
    elements.btnSchedAccum.addEventListener('click', () => setScheduleFilter('accum'));
  }
  if (elements.btnSchedDraw) {
    elements.btnSchedDraw.addEventListener('click', () => setScheduleFilter('draw'));
  }

  // Header Actions
  elements.btnExportCSV.addEventListener('click', exportToCSV);
  elements.btnPrint.addEventListener('click', () => window.print());

  // Presets
  elements.presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      elements.presetButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyPreset(btn.dataset.preset);
      markProfileModified();
    });
  });

  // Profile Management Listeners
  if (elements.btnProfileSave) {
    elements.btnProfileSave.addEventListener('click', () => {
      if (currentProfileName) {
        // If editing an already saved profile, just override it!
        const profiles = getAllProfiles();
        profiles[currentProfileName] = extractCurrentStateData();
        saveAllProfiles(profiles);
        isProfileModified = false;
        updateProfileBadge(false);
        showToast(`Profile "${currentProfileName}" saved!`);
      } else {
        openProfileModal('save');
      }
    });
  }

  if (elements.btnProfileSaveAs) {
    elements.btnProfileSaveAs.addEventListener('click', () => {
      openProfileModal('saveAs');
    });
  }

  if (elements.btnProfileScratch) {
    elements.btnProfileScratch.addEventListener('click', () => {
      currentProfileName = null;
      isProfileModified = false;
      applyDataToState(SCRATCH_PROFILE);
      refreshProfileDropdown();
      showToast('Started fresh from scratch');
    });
  }

  if (elements.btnProfileDelete) {
    elements.btnProfileDelete.addEventListener('click', () => {
      if (!currentProfileName) return;
      if (confirm(`Are you sure you want to delete profile "${currentProfileName}"?`)) {
        const deletedName = currentProfileName;
        const profiles = getAllProfiles();
        delete profiles[deletedName];
        saveAllProfiles(profiles);
        currentProfileName = null;
        isProfileModified = false;
        refreshProfileDropdown();
        showToast(`Profile "${deletedName}" deleted`);
      }
    });
  }

  if (elements.profileSelect) {
    elements.profileSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (!selected) {
        currentProfileName = null;
        isProfileModified = false;
        updateProfileBadge(false);
        showToast('Switched to Scratch / Unsaved mode');
        return;
      }
      const profiles = getAllProfiles();
      if (profiles[selected]) {
        currentProfileName = selected;
        isProfileModified = false;
        applyDataToState(profiles[selected]);
        showToast(`Loaded profile "${selected}"`);
      }
    });
  }

  // Profile Modal Form Handlers
  if (elements.profileModalForm) {
    elements.profileModalForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = elements.profileNameInput.value.trim();
      if (!name) {
        if (elements.modalError) {
          elements.modalError.textContent = 'Please enter a valid profile name.';
          elements.modalError.style.display = 'block';
        }
        return;
      }
      const profiles = getAllProfiles();
      profiles[name] = extractCurrentStateData();
      saveAllProfiles(profiles);
      currentProfileName = name;
      isProfileModified = false;
      closeProfileModal();
      refreshProfileDropdown();
      showToast(`Profile "${name}" saved!`);
    });
  }

  if (elements.btnModalClose) {
    elements.btnModalClose.addEventListener('click', closeProfileModal);
  }
  if (elements.btnModalCancel) {
    elements.btnModalCancel.addEventListener('click', closeProfileModal);
  }
  if (elements.profileModalOverlay) {
    elements.profileModalOverlay.addEventListener('click', (e) => {
      if (e.target === elements.profileModalOverlay) closeProfileModal();
    });
  }
}

function setScheduleFilter(filter) {
  state.scheduleFilter = filter;
  [elements.btnSchedAll, elements.btnSchedAccum, elements.btnSchedDraw].forEach(btn => {
    if (btn) btn.classList.toggle('active', btn.dataset.sched === filter);
  });
  if (currentForecast) {
    renderScheduleTable(currentForecast.timeline);
  }
}

function setViewMode(mode) {
  state.viewMode = mode;
  [elements.btnModeSideBySide, elements.btnModeReal, elements.btnModeNominal].forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === mode);
  });
  updateResultsUI();
}

/**
 * Updates dynamic helper tags for employee workplace contribution
 */
function updateContributionHelpers() {
  const salary = state.annualSalary;
  const monthlySalary = salary / 12;

  if (state.contributionType === 'percent') {
    const monthlyEquiv = monthlySalary * (state.contribPercent / 100);
    elements.equivMonthlyText.textContent = `Equivalent to ${formatGBP(monthlyEquiv, 2)} / month`;
    elements.contribAmount.value = Math.round(monthlyEquiv);
    state.contribAmount = Math.round(monthlyEquiv);
  } else {
    const percentEquiv = monthlySalary > 0 ? (state.contribAmount / monthlySalary) * 100 : 0;
    elements.equivPercentText.textContent = `Equivalent to ${percentEquiv.toFixed(1)}% of current salary`;
    elements.contribPercent.value = percentEquiv.toFixed(1);
    elements.contribPercentNum.value = percentEquiv.toFixed(1);
    elements.valContribPercent.textContent = `${percentEquiv.toFixed(1)}%`;
    state.contribPercent = parseFloat(percentEquiv.toFixed(1));
  }
}

/**
 * Updates SIPP Tax Relief Breakdown Box
 */
function updateSippTaxReliefHelpers() {
  const net = state.externalSippMonthlyNet;
  const netAnnual = net * 12;
  const hmrcRelief = net * 0.25; // 20% basic rate relief at source = +25% top up on net
  const hmrcReliefAnnual = netAnnual * 0.25;
  const gross = net + hmrcRelief;
  const grossAnnual = netAnnual + hmrcReliefAnnual;

  if (elements.sippNetLabel) {
    elements.sippNetLabel.textContent = `${formatGBP(net)} / mo (${formatGBP(netAnnual)}/yr)`;
  }
  if (elements.sippHmrcLabel) {
    elements.sippHmrcLabel.textContent = `+${formatGBP(hmrcRelief)} / mo (+${formatGBP(hmrcReliefAnnual)}/yr)`;
  }
  if (elements.sippGrossLabel) {
    elements.sippGrossLabel.textContent = `${formatGBP(gross)} / mo (${formatGBP(grossAnnual)}/yr)`;
  }

  if (elements.sippExtraReliefText) {
    if (state.userTaxBand === 'higher') {
      const extraMo = gross * 0.20;
      const extraYr = grossAnnual * 0.20;
      elements.sippExtraReliefText.style.display = 'block';
      elements.sippExtraReliefText.textContent = `Higher Rate (40%): Claim extra ${formatGBP(extraMo)}/mo (${formatGBP(extraYr)}/yr) back via Self Assessment!`;
    } else if (state.userTaxBand === 'additional') {
      const extraMo = gross * 0.25;
      const extraYr = grossAnnual * 0.25;
      elements.sippExtraReliefText.style.display = 'block';
      elements.sippExtraReliefText.textContent = `Additional Rate (45%): Claim extra ${formatGBP(extraMo)}/mo (${formatGBP(extraYr)}/yr) back via Self Assessment!`;
    } else {
      elements.sippExtraReliefText.style.display = 'none';
    }
  }
}

/**
 * Applies predefined financial scenarios
 */
function applyPreset(name) {
  switch (name) {
    case 'auto-enrol':
      state.currentAge = 30;
      state.retirementAge = 67;
      state.annualSalary = 45000;
      state.contributionType = 'percent';
      state.contribPercent = 5.0;
      state.employerPercent = 3.0;
      state.externalSippMonthlyNet = 100;
      state.salaryIncrease = 3.0;
      state.inflationRate = 2.5;
      state.growthRate = 6.0;
      state.feeRate = 0.5;
      state.takeLumpSum = true;
      state.lumpSumPercent = 25;
      state.drawdownRate = 4.0;
      state.includeStatePension = true;
      break;

    case 'booster':
      state.currentAge = 35;
      state.retirementAge = 65;
      state.annualSalary = 65000;
      state.contributionType = 'percent';
      state.contribPercent = 10.0;
      state.employerPercent = 5.0;
      state.externalSippMonthlyNet = 300;
      state.salaryIncrease = 3.5;
      state.inflationRate = 2.5;
      state.growthRate = 6.5;
      state.feeRate = 0.45;
      state.takeLumpSum = true;
      state.lumpSumPercent = 25;
      state.drawdownRate = 4.0;
      state.includeStatePension = true;
      break;

    case 'early-retire':
      state.currentAge = 32;
      state.retirementAge = 57; // UK normal minimum pension age from 2028
      state.annualSalary = 75000;
      state.contributionType = 'percent';
      state.contribPercent = 20.0;
      state.employerPercent = 6.0;
      state.externalSippMonthlyNet = 500;
      state.salaryIncrease = 2.5;
      state.inflationRate = 2.5;
      state.growthRate = 7.0;
      state.feeRate = 0.4;
      state.takeLumpSum = true;
      state.lumpSumPercent = 25;
      state.drawdownRate = 3.75;
      state.includeStatePension = true;
      state.statePensionAge = 67;
      break;

    case 'high-inflation':
      state.inflationRate = 5.0;
      state.salaryIncrease = 4.5;
      state.growthRate = 7.5;
      break;

    case 'no-lump-sum':
      state.takeLumpSum = false;
      state.lumpSumPercent = 0;
      break;
  }

  syncAllInputElements();
  recalculate();
}

/**
 * Synchronize all form fields from state
 */
function syncAllInputElements() {
  elements.currentAge.value = state.currentAge;
  elements.currentAgeNum.value = state.currentAge;
  elements.valCurrentAge.textContent = `${state.currentAge} yrs`;

  elements.retirementAge.value = state.retirementAge;
  elements.retirementAgeNum.value = state.retirementAge;
  elements.valRetirementAge.textContent = `${state.retirementAge} yrs`;

  elements.currentPot.value = state.currentPot;
  elements.annualSalary.value = state.annualSalary;

  if (state.contributionType === 'percent') {
    elements.btnModePercent.classList.add('active');
    elements.btnModeAmount.classList.remove('active');
    elements.groupContribPercent.style.display = 'block';
    elements.groupContribAmount.style.display = 'none';
  } else {
    elements.btnModeAmount.classList.add('active');
    elements.btnModePercent.classList.remove('active');
    elements.groupContribPercent.style.display = 'none';
    elements.groupContribAmount.style.display = 'block';
  }

  elements.contribPercent.value = state.contribPercent;
  elements.contribPercentNum.value = state.contribPercent;
  elements.valContribPercent.textContent = `${state.contribPercent}%`;

  elements.contribAmount.value = state.contribAmount;

  elements.salaryIncrease.value = state.salaryIncrease;
  elements.salaryIncreaseNum.value = state.salaryIncrease;
  elements.valSalaryIncrease.textContent = `${state.salaryIncrease}%`;

  elements.employerPercent.value = state.employerPercent;
  elements.employerPercentNum.value = state.employerPercent;
  elements.valEmployerPercent.textContent = `${state.employerPercent}%`;

  // External SIPP
  if (elements.externalSippMonthlyNet) {
    elements.externalSippMonthlyNet.value = state.externalSippMonthlyNet;
    elements.externalSippMonthlyNetNum.value = state.externalSippMonthlyNet;
    elements.valExternalSippNet.textContent = `£${state.externalSippMonthlyNet}/mo`;
  }
  if (elements.userTaxBand) {
    elements.userTaxBand.value = state.userTaxBand;
  }

  elements.inflationRate.value = state.inflationRate;
  elements.inflationRateNum.value = state.inflationRate;
  elements.valInflationRate.textContent = `${state.inflationRate}%`;

  elements.growthRate.value = state.growthRate;
  elements.growthRateNum.value = state.growthRate;
  elements.valGrowthRate.textContent = `${state.growthRate}%`;

  elements.feeRate.value = state.feeRate;
  elements.feeRateNum.value = state.feeRate;
  elements.valFeeRate.textContent = `${state.feeRate}%`;

  elements.takeLumpSum.checked = state.takeLumpSum;
  elements.lumpSumSliderWrap.style.display = state.takeLumpSum ? 'block' : 'none';
  elements.lumpSumPercent.value = state.lumpSumPercent;
  elements.lumpSumPercentNum.value = state.lumpSumPercent;
  elements.valLumpSumPercent.textContent = `${state.lumpSumPercent}%`;

  elements.drawdownRate.value = state.drawdownRate;
  elements.drawdownRateNum.value = state.drawdownRate;
  elements.valDrawdownRate.textContent = `${state.drawdownRate}%`;

  elements.includeStatePension.checked = state.includeStatePension;
  elements.statePensionWrap.style.display = state.includeStatePension ? 'block' : 'none';
  elements.statePensionAnnual.value = state.statePensionAnnual;
  elements.statePensionAge.value = state.statePensionAge;
  elements.statePensionAgeNum.value = state.statePensionAge;
  elements.valStatePensionAge.textContent = `${state.statePensionAge} yrs`;

  if (elements.btnDrawStratPct && elements.btnDrawStratFlat) {
    elements.btnDrawStratPct.classList.toggle('active', state.drawdownStrategy === 'percentOfPot');
    elements.btnDrawStratFlat.classList.toggle('active', state.drawdownStrategy === 'flatReal');
  }

  updateContributionHelpers();
  updateSippTaxReliefHelpers();
}

/**
 * Main Calculation Dispatcher
 */
function recalculate() {
  const years = Math.max(1, state.retirementAge - state.currentAge);
  elements.yearsToRetireText.textContent = `${years} years of compounding remaining`;

  const netNominal = state.growthRate - state.feeRate;
  const netReal = ((1 + netNominal / 100) / (1 + state.inflationRate / 100) - 1) * 100;
  elements.netRealReturnTag.textContent = `Net Real Return: ~${netReal.toFixed(1)}% / yr (after ${state.feeRate}% fees & ${state.inflationRate}% inflation)`;

  currentForecast = calculatePensionForecast({
    currentAge: state.currentAge,
    retirementAge: state.retirementAge,
    annualSalary: state.annualSalary,
    contributionType: state.contributionType,
    employeeContribution: state.contributionType === 'percent' ? state.contribPercent : state.contribAmount,
    employerContributionPercent: state.employerPercent,
    externalSippMonthlyNet: state.externalSippMonthlyNet,
    taxBand: state.userTaxBand,
    annualSalaryIncrease: state.salaryIncrease,
    inflationRate: state.inflationRate,
    currentPot: state.currentPot,
    investmentGrowthRate: state.growthRate,
    feeRate: state.feeRate,
    takeLumpSum: state.takeLumpSum,
    lumpSumPercent: state.lumpSumPercent,
    drawdownRate: state.drawdownRate,
    drawdownStrategy: state.drawdownStrategy,
    includeStatePension: state.includeStatePension,
    statePensionAnnual: state.statePensionAnnual,
    statePensionAge: state.statePensionAge
  });

  updateResultsUI();
}

/**
 * Update DOM Results and Charts
 */
function updateResultsUI() {
  if (!currentForecast) return;
  const { summary, timeline, inputs } = currentForecast;
  const isMonthly = state.frequency === 'monthly';
  const unit = isMonthly ? '/ month' : '/ year';
  const mult = isMonthly ? 1 / 12 : 1;

  // Hero Card Values
  const realIncomeVal = summary.fullCombinedAnnualReal * mult;
  const nominalIncomeVal = summary.fullCombinedAnnualNominal * mult;

  if (state.viewMode === 'nominal') {
    elements.heroIncomeMain.textContent = `${formatGBP(nominalIncomeVal)} ${unit}`;
    elements.heroIncomeSub.textContent = `Future Value (Nominal £ in retirement year)`;
    elements.heroIncomeNominal.textContent = `${formatGBP(realIncomeVal)} ${unit}`;
    elements.heroInflationNote.textContent = `Purchasing power equivalent in today's money`;
  } else {
    elements.heroIncomeMain.textContent = `${formatGBP(realIncomeVal)} ${unit}`;
    elements.heroIncomeSub.textContent = `In Today's Purchasing Power (Real £)`;
    elements.heroIncomeNominal.textContent = `${formatGBP(nominalIncomeVal)} ${unit}`;
    elements.heroInflationNote.textContent = `Future nominal value after ${inputs.inflationRate}% inflation over ${summary.yearsToRetire} yrs`;
  }

  // Monthly / Annual Source Breakdown (Private Pot vs UK Public State Pension)
  const potIncomeValReal = (isMonthly ? summary.potIncomeMonthlyReal : summary.potIncomeAnnualReal);
  const potIncomeValNom = (isMonthly ? summary.potIncomeMonthlyNominal : summary.potIncomeAnnualNominal);

  const spIncomeValReal = (isMonthly ? summary.statePensionMonthlyReal : summary.statePensionAnnualReal);
  const spIncomeValNom = (isMonthly ? summary.statePensionMonthlyNominal : summary.statePensionAnnualNominal);

  if (elements.heroSplitPrivateReal) {
    elements.heroSplitPrivateReal.textContent = `${formatGBP(potIncomeValReal)} ${unit}`;
  }
  if (elements.heroSplitPrivateNom) {
    elements.heroSplitPrivateNom.textContent = `Nominal: ${formatGBP(potIncomeValNom)} ${unit}`;
  }
  if (elements.heroSplitPrivateShare) {
    elements.heroSplitPrivateShare.textContent = `${summary.privateSharePercent.toFixed(0)}%`;
  }

  if (elements.heroSplitPublicReal) {
    elements.heroSplitPublicReal.textContent = `${formatGBP(spIncomeValReal)} ${unit}`;
  }
  if (elements.heroSplitPublicNom) {
    elements.heroSplitPublicNom.textContent = `Nominal: ${formatGBP(spIncomeValNom)} ${unit}`;
  }
  if (elements.heroSplitPublicShare) {
    elements.heroSplitPublicShare.textContent = `${summary.publicSharePercent.toFixed(0)}%`;
  }

  // PLSA Living Standard Badge & Meter
  const annualReal = summary.fullCombinedAnnualReal;
  elements.plsaBadge.textContent = `${summary.plsaCategory} Standard`;
  elements.plsaBadge.className = 'badge-plsa';

  if (summary.plsaCategory === 'Comfortable') {
    elements.plsaBadge.classList.add('comfortable');
  } else if (summary.plsaCategory === 'Moderate') {
    elements.plsaBadge.classList.add('moderate');
  } else if (summary.plsaCategory === 'Minimum') {
    elements.plsaBadge.classList.add('minimum');
  } else {
    elements.plsaBadge.classList.add('below');
  }

  const comfortableTarget = UK_DEFAULTS.PLSA_STANDARDS.comfortable;
  const progressPct = Math.min(100, Math.max(5, (annualReal / (comfortableTarget * 1.25)) * 100));
  elements.plsaProgressBar.style.width = `${progressPct}%`;

  // Metric Cards
  elements.metricPotReal.textContent = formatGBP(summary.potReal);
  elements.metricPotNominal.textContent = formatGBP(summary.potNominal);

  elements.metricLumpReal.textContent = formatGBP(summary.lumpSumReal);
  elements.metricLumpNominal.textContent = formatGBP(summary.lumpSumNominal);
  elements.lumpCappedNote.style.display = summary.lumpSumCapped ? 'inline-block' : 'none';

  elements.metricRemReal.textContent = formatGBP(summary.remainingPotReal);
  elements.metricRemNominal.textContent = formatGBP(summary.remainingPotNominal);

  elements.metricPotIncReal.textContent = `${formatGBP(potIncomeValReal)} ${unit}`;
  elements.metricPotIncNominal.textContent = `${formatGBP(potIncomeValNom)} ${unit}`;

  elements.metricSpReal.textContent = `${formatGBP(spIncomeValReal)} ${unit}`;
  elements.metricSpNominal.textContent = `${formatGBP(spIncomeValNom)} ${unit}`;

  elements.metricReplacementRate.textContent = `${summary.replacementRate.toFixed(1)}%`;
  elements.metricFinalSalary.textContent = formatGBP(summary.finalSalaryNominal);

  // Pot Balance at Age 100 & Longevity
  if (elements.metricAge100Real && elements.metricAge100Nominal && elements.metricAge100Status) {
    if (summary.potDepletedAge) {
      elements.metricAge100Real.textContent = '£0';
      elements.metricAge100Nominal.textContent = '£0';
      elements.metricAge100Status.textContent = `Pot Depleted at Age ${summary.potDepletedAge}`;
      elements.metricAge100Status.className = 'metric-label-real text-red';
    } else {
      elements.metricAge100Real.textContent = formatGBP(summary.potAt100Real);
      elements.metricAge100Nominal.textContent = formatGBP(summary.potAt100Nominal);
      elements.metricAge100Status.textContent = `In Today's Money (Sustained to 100+)`;
      elements.metricAge100Status.className = 'metric-label-real';
    }
  }

  // Update Charts (now showing State Pension triple-lock growth curve across the entire lifetime)
  renderGrowthChart(elements.chartGrowthContainer, timeline, inputs.currentAge, inputs.retirementAge, summary.potDepletedAge);
  renderIncomeComparisonChart(elements.chartIncomeContainer, summary, isMonthly);
  elements.incomeChartSubtitle.textContent = `Direct side-by-side comparison ${unit}`;

  // Purchasing Power Trajectory Chart (Private Pot Drawdown vs Triple-Lock Public State Pension)
  if (elements.chartPurchasingPowerContainer) {
    renderPurchasingPowerIncomeChart(elements.chartPurchasingPowerContainer, timeline, inputs.retirementAge, inputs.statePensionAge, isMonthly);
  }
  if (elements.purchasingPowerStartAge) {
    elements.purchasingPowerStartAge.textContent = inputs.retirementAge;
  }
  if (elements.explainerSpAmount) {
    const spRealDisplay = isMonthly ? summary.statePensionMonthlyReal : summary.statePensionAnnualReal;
    elements.explainerSpAmount.textContent = `${formatGBP(spRealDisplay)} ${unit}`;
  }
  if (elements.explainerDrawdownRate) {
    elements.explainerDrawdownRate.textContent = `${inputs.drawdownRate.toFixed(1)}%`;
  }
  if (elements.explainerNetReal) {
    const netNom = inputs.investmentGrowthRate - inputs.feeRate;
    const netR = ((1 + netNom / 100) / (1 + inputs.inflationRate / 100) - 1) * 100;
    elements.explainerNetReal.textContent = `${netR.toFixed(1)}%`;
  }

  // Update Comparison Table
  renderComparisonTable(summary, isMonthly);

  // Update Full Schedule Table
  renderScheduleTable(timeline);
}

/**
 * Render Side-by-side matrix table
 */
function renderComparisonTable(summary, isMonthly) {
  const mult = isMonthly ? 1 / 12 : 1;
  const unit = isMonthly ? ' / mo' : ' / yr';
  const deflator = summary.totalInflationDeflator;
  const lossPct = ((1 - (1 / deflator)) * 100).toFixed(1);

  const rows = [
    {
      label: 'Total Pension Pot (at Retirement)',
      nominal: formatGBP(summary.potNominal),
      real: formatGBP(summary.potReal),
      loss: `-${lossPct}%`,
      note: 'Overall accumulated wealth at retirement (Workplace + SIPP)'
    },
    {
      label: '25% Tax-Free Lump Sum (PCLS)',
      nominal: formatGBP(summary.lumpSumNominal),
      real: formatGBP(summary.lumpSumReal),
      loss: `-${lossPct}%`,
      note: summary.lumpSumCapped ? 'Capped at statutory £268,275 allowance' : 'Up to 25% tax-free upfront'
    },
    {
      label: 'Remaining Pot for Drawdown',
      nominal: formatGBP(summary.remainingPotNominal),
      real: formatGBP(summary.remainingPotReal),
      loss: `-${lossPct}%`,
      note: 'Invested for ongoing lifetime withdrawals'
    },
    {
      label: `Private Pot Drawdown Income (${summary.inputs?.drawdownRate || 4}%)`,
      nominal: `${formatGBP(summary.potIncomeAnnualNominal * mult)}${unit}`,
      real: `${formatGBP(summary.potIncomeAnnualReal * mult)}${unit}`,
      loss: `-${lossPct}%`,
      note: 'Regular pension withdrawals from invested pot'
    },
    {
      label: 'UK Public State Pension',
      nominal: `${formatGBP(summary.statePensionAnnualNominal * mult)}${unit}`,
      real: `${formatGBP(summary.statePensionAnnualReal * mult)}${unit}`,
      loss: '0.0%',
      note: 'Triple-lock protects 100% purchasing power'
    },
    {
      label: 'Total Combined Retirement Income',
      nominal: `<strong>${formatGBP(summary.fullCombinedAnnualNominal * mult)}${unit}</strong>`,
      real: `<strong style="color:var(--emerald);">${formatGBP(summary.fullCombinedAnnualReal * mult)}${unit}</strong>`,
      loss: `<span class="badge-loss">-${(((summary.fullCombinedAnnualNominal - summary.fullCombinedAnnualReal) / summary.fullCombinedAnnualNominal) * 100).toFixed(1)}%</span>`,
      note: 'Private pot drawdown + UK State Pension'
    },
    {
      label: 'Remaining Pot Balance at Age 100',
      nominal: summary.potDepletedAge ? '<span class="text-red">£0 (Depleted)</span>' : formatGBP(summary.potAt100Nominal),
      real: summary.potDepletedAge ? `<span class="text-red">Depleted at Age ${summary.potDepletedAge}</span>` : formatGBP(summary.potAt100Real),
      loss: summary.potDepletedAge ? '<span class="badge-loss">100%</span>' : `-${lossPct}%`,
      note: summary.potDepletedAge ? `Pot exhausted at age ${summary.potDepletedAge}` : 'Surplus capital remaining at age 100'
    }
  ];

  if (summary.externalSippMonthlyNet > 0) {
    rows.splice(1, 0, {
      label: 'SIPP Contributions & HMRC Tax Relief',
      nominal: `Net: ${formatGBP(summary.cumulativeSippNetNominal)} + HMRC: ${formatGBP(summary.cumulativeSippHmrcReliefNominal)}`,
      real: `Total Gross: ${formatGBP(summary.cumulativeSippGrossNominal)}`,
      loss: `+25% top-up`,
      note: `HMRC added basic rate relief directly into your SIPP`
    });
  }

  elements.comparisonMatrixBody.innerHTML = rows.map(r => `
    <tr>
      <td>
        <strong>${r.label}</strong>
        <div class="field-help">${r.note}</div>
      </td>
      <td class="text-right font-mono">${r.nominal}</td>
      <td class="text-right font-mono">${r.real}</td>
      <td class="text-right font-mono">${r.loss.includes('badge-loss') ? r.loss : `<span class="badge-loss">${r.loss}</span>`}</td>
    </tr>
  `).join('');
}

/**
 * Render Full Projection Table
 */
function renderScheduleTable(timeline) {
  let filtered = timeline;
  if (state.scheduleFilter === 'accum') {
    filtered = timeline.filter(d => d.age <= state.retirementAge);
  } else if (state.scheduleFilter === 'draw') {
    filtered = timeline.filter(d => d.age >= state.retirementAge);
  }

  elements.scheduleTableBody.innerHTML = filtered.map(row => {
    const isAccum = row.phase === 'accumulation' || row.age < state.retirementAge;
    const isRetireTransition = row.isRetirementTransition;
    
    let phaseBadge = '';
    let cashFlow = '';
    let contribOrWithdrawal = '';

    if (isRetireTransition) {
      phaseBadge = `<span class="badge-phase-cell draw">Retire</span>`;
      cashFlow = `Lump Sum: ${formatGBP(row.lumpSumTakenReal || 0)}`;
      contribOrWithdrawal = `<span style="color:#0369a1;">PCLS: -${formatGBP(row.lumpSumTakenNominal || 0)}</span>`;
    } else if (isAccum) {
      phaseBadge = `<span class="badge-phase-cell accum">Saving</span>`;
      cashFlow = `Salary: ${formatGBP(row.salary)}`;
      contribOrWithdrawal = `<span style="color:#059669;">+${formatGBP(row.totalContrib)}</span>`;
    } else {
      phaseBadge = `<span class="badge-phase-cell draw">Drawdown</span>`;
      cashFlow = `Income: ${formatGBP(row.totalIncomeReal)}/yr`;
      contribOrWithdrawal = row.isPotDepleted 
        ? `<span class="text-red">£0 (Depleted)</span>`
        : `<span style="color:#dc2626;">-${formatGBP(row.potDrawdownNominal)}</span>`;
    }

    return `
      <tr>
        <td class="font-mono"><strong>${row.age}</strong></td>
        <td class="font-mono">Yr ${row.year}</td>
        <td>${phaseBadge}</td>
        <td class="font-mono">${cashFlow}</td>
        <td class="font-mono">${contribOrWithdrawal}</td>
        <td class="font-mono" style="color:var(--emerald);">${row.investmentGain > 0 ? '+' : ''}${formatGBP(row.investmentGain)}</td>
        <td class="font-mono"><strong>${formatGBP(row.closingPotNominal)}</strong></td>
        <td class="font-mono" style="color:var(--primary); font-weight:600;">${formatGBP(row.closingPotReal)}</td>
      </tr>
    `;
  }).join('');
}

/**
 * CSV Export (Full Lifetime to Age 100)
 */
function exportToCSV() {
  if (!currentForecast || !currentForecast.timeline) return;
  const headers = [
    'Age', 'Year', 'Phase', 'Annual Salary (£)', 'Workplace Contrib (£)', 'SIPP Net Contrib (£)', 
    'SIPP HMRC Relief (£)', 'Total Contrib (£)', 'Pot Drawdown (£)', 'State Pension (£)', 
    'Total Income (£)', 'Investment Gain (£)', 'Closing Pot Nominal (£)', 'Closing Pot Real (£)', 'Inflation Factor'
  ];

  const rows = currentForecast.timeline.map(d => [
    d.age,
    d.year,
    d.phase,
    (d.salary || 0).toFixed(2),
    (d.workplaceContrib || 0).toFixed(2),
    (d.sippNetContrib || 0).toFixed(2),
    (d.sippHmrcRelief || 0).toFixed(2),
    (d.totalContrib || 0).toFixed(2),
    (d.potDrawdownNominal || 0).toFixed(2),
    (d.statePensionNominal || 0).toFixed(2),
    (d.totalIncomeNominal || 0).toFixed(2),
    (d.investmentGain || 0).toFixed(2),
    (d.closingPotNominal || 0).toFixed(2),
    (d.closingPotReal || 0).toFixed(2),
    d.inflationFactor.toFixed(4)
  ]);

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `UK_Pension_Forecast_Age_${state.currentAge}_to_100.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function initProfiles() {
  const profiles = getAllProfiles();
  const keys = Object.keys(profiles);
  if (keys.length > 0) {
    currentProfileName = keys[0];
    applyDataToState(profiles[currentProfileName]);
  } else {
    currentProfileName = null;
    syncAllInputElements();
    recalculate();
  }
  refreshProfileDropdown();
}

// Initialise Application on load
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  initProfiles();
});
