/**
 * Zero-Token Financial Calculation Engine
 * Deterministically computes net worth, runway, cash flow, inflation, and savings rates
 * across 20 quarters (5 years) without consuming LLM tokens.
 */

export interface QuarterFinanceInput {
  quarter: number; // 1 to 20
  startingSavings: number;
  monthlyIncome: number;
  monthlyBaseExpenses: number;
  costOfLivingIndex?: number; // e.g., 1.0 = baseline, 1.35 = London, 0.85 = Tier-2 city
  annualInflationRate?: number; // default: 0.035 (3.5%)
  annualInvestmentReturn?: number; // default: 0.05 (5.0%)
  eventCashImpact?: number; // +ve for bonus/windfall, -ve for emergency/relocation cost
}

export interface QuarterFinanceOutput {
  quarter: number;
  startingSavings: number;
  endingSavings: number;
  netQuarterCashFlow: number;
  effectiveQuarterlyIncome: number;
  effectiveQuarterlyExpenses: number;
  effectiveMonthlyBurn: number;
  investmentGain: number;
  runwayMonths: number;
  savingsRatePercentage: number;
  financialHealthScore: number; // 0 to 100
  isDeficit: boolean;
  isBankrupt: boolean;
}

/**
 * Calculates financial state for a single 3-month quarter.
 */
export function calculateQuarterFinance(input: QuarterFinanceInput): QuarterFinanceOutput {
  const {
    quarter,
    startingSavings,
    monthlyIncome,
    monthlyBaseExpenses,
    costOfLivingIndex = 1.0,
    annualInflationRate = 0.035,
    annualInvestmentReturn = 0.05,
    eventCashImpact = 0,
  } = input;

  // 1. Compound inflation factor based on quarters passed (4 quarters per year)
  const yearsElapsed = Math.max(0, quarter - 1) / 4;
  const inflationFactor = Math.pow(1 + annualInflationRate, yearsElapsed);

  // 2. Compute effective quarterly numbers (3 months per quarter)
  const effectiveQuarterlyIncome = Math.max(0, monthlyIncome * 3);
  const effectiveMonthlyExpenses = Math.max(
    0,
    monthlyBaseExpenses * costOfLivingIndex * inflationFactor
  );
  const effectiveQuarterlyExpenses = effectiveMonthlyExpenses * 3;

  // 3. Investment return on positive starting capital
  const quarterlyReturnRate = Math.pow(1 + annualInvestmentReturn, 0.25) - 1;
  const investmentGain =
    startingSavings > 0 ? Math.round(startingSavings * quarterlyReturnRate) : 0;

  // 4. Net quarterly cash flow (Income - Expenses + Event Impact + Investment Growth)
  const netQuarterCashFlow = Math.round(
    effectiveQuarterlyIncome - effectiveQuarterlyExpenses + eventCashImpact + investmentGain
  );

  // 5. Ending savings & financial state
  const endingSavings = startingSavings + netQuarterCashFlow;
  const isDeficit = netQuarterCashFlow < 0;
  const isBankrupt = endingSavings <= 0;

  // 6. Runway in months
  let runwayMonths = 0;
  if (endingSavings > 0 && effectiveMonthlyExpenses > 0) {
    runwayMonths = Number((endingSavings / effectiveMonthlyExpenses).toFixed(1));
  } else if (endingSavings > 0 && effectiveMonthlyExpenses === 0) {
    runwayMonths = 999;
  }

  // 7. Savings rate percentage
  let savingsRatePercentage = 0;
  if (effectiveQuarterlyIncome > 0) {
    const rawRate =
      ((effectiveQuarterlyIncome - effectiveQuarterlyExpenses) / effectiveQuarterlyIncome) * 100;
    savingsRatePercentage = Number(Math.max(-100, Math.min(100, rawRate)).toFixed(1));
  }

  // 8. Calibrated financial health score (0 to 100)
  const financialHealthScore = computeFinancialHealthScore({
    endingSavings,
    runwayMonths,
    savingsRatePercentage,
    isBankrupt,
  });

  return {
    quarter,
    startingSavings,
    endingSavings,
    netQuarterCashFlow,
    effectiveQuarterlyIncome: Math.round(effectiveQuarterlyIncome),
    effectiveQuarterlyExpenses: Math.round(effectiveQuarterlyExpenses),
    effectiveMonthlyBurn: Math.round(effectiveMonthlyExpenses),
    investmentGain,
    runwayMonths,
    savingsRatePercentage,
    financialHealthScore,
    isDeficit,
    isBankrupt,
  };
}

/**
 * Computes a weighted 0-100 financial health score based on emergency runway,
 * savings rate, and solvency.
 */
function computeFinancialHealthScore(metrics: {
  endingSavings: number;
  runwayMonths: number;
  savingsRatePercentage: number;
  isBankrupt: boolean;
}): number {
  if (metrics.isBankrupt) return 0;

  let score = 50;

  // Runway scoring (Up to 35 points)
  if (metrics.runwayMonths >= 12) {
    score += 35;
  } else if (metrics.runwayMonths >= 6) {
    score += 25;
  } else if (metrics.runwayMonths >= 3) {
    score += 10;
  } else {
    score -= 25; // Critical runway
  }

  // Savings rate scoring (Up to 15 points)
  if (metrics.savingsRatePercentage >= 30) {
    score += 15;
  } else if (metrics.savingsRatePercentage >= 15) {
    score += 10;
  } else if (metrics.savingsRatePercentage > 0) {
    score += 5;
  } else {
    score -= 15; // Living beyond means
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Simulates a full 20-quarter (5-year) financial trajectory sequentially.
 */
export function simulate5YearFinancialTrajectory(params: {
  initialSavings: number;
  monthlyIncome: number;
  monthlyBaseExpenses: number;
  costOfLivingIndex?: number;
  annualInflationRate?: number;
  annualInvestmentReturn?: number;
  quarterlyEventDeltas?: Record<number, number>; // quarter -> cash impact
}): QuarterFinanceOutput[] {
  const trajectory: QuarterFinanceOutput[] = [];
  let currentSavings = params.initialSavings;

  for (let q = 1; q <= 20; q++) {
    const eventImpact = params.quarterlyEventDeltas?.[q] || 0;

    const output = calculateQuarterFinance({
      quarter: q,
      startingSavings: currentSavings,
      monthlyIncome: params.monthlyIncome,
      monthlyBaseExpenses: params.monthlyBaseExpenses,
      costOfLivingIndex: params.costOfLivingIndex,
      annualInflationRate: params.annualInflationRate,
      annualInvestmentReturn: params.annualInvestmentReturn,
      eventCashImpact: eventImpact,
    });

    trajectory.push(output);
    currentSavings = output.endingSavings;
  }

  return trajectory;
}
