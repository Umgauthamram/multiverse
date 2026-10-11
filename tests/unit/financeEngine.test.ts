import { describe, it, expect } from "vitest";
import {
  calculateQuarterFinance,
  simulate5YearFinancialTrajectory,
} from "@/lib/simulation/financeEngine";

describe("Phase 9: Zero-Token Financial Calculation Engine", () => {
  it("calculates quarter 1 financial state accurately with positive cash flow", () => {
    const result = calculateQuarterFinance({
      quarter: 1,
      startingSavings: 10000,
      monthlyIncome: 4000,
      monthlyBaseExpenses: 2500,
      costOfLivingIndex: 1.0,
      annualInflationRate: 0.03,
      annualInvestmentReturn: 0.04,
      eventCashImpact: 0,
    });

    expect(result.effectiveQuarterlyIncome).toBe(12000); // 4000 * 3
    expect(result.effectiveQuarterlyExpenses).toBe(7500); // 2500 * 3
    expect(result.netQuarterCashFlow).toBeGreaterThan(4500); // 4500 + investment gain
    expect(result.endingSavings).toBeGreaterThan(14500);
    expect(result.runwayMonths).toBeGreaterThan(5);
    expect(result.savingsRatePercentage).toBe(37.5); // (12000 - 7500) / 12000 * 100
    expect(result.isBankrupt).toBe(false);
    expect(result.isDeficit).toBe(false);
    expect(result.financialHealthScore).toBeGreaterThanOrEqual(70);
  });

  it("applies compounded inflation to expenses across 20 quarters", () => {
    const q1 = calculateQuarterFinance({
      quarter: 1,
      startingSavings: 5000,
      monthlyIncome: 3000,
      monthlyBaseExpenses: 2000,
      annualInflationRate: 0.04, // 4% annual inflation
    });

    const q20 = calculateQuarterFinance({
      quarter: 20, // 4.75 years elapsed
      startingSavings: 5000,
      monthlyIncome: 3000,
      monthlyBaseExpenses: 2000,
      annualInflationRate: 0.04,
    });

    // Expenses in Q20 must be higher due to compound inflation
    expect(q20.effectiveMonthlyBurn).toBeGreaterThan(q1.effectiveMonthlyBurn);
    const expectedFactor = Math.pow(1 + 0.04, 19 / 4);
    expect(q20.effectiveMonthlyBurn).toBe(Math.round(2000 * expectedFactor));
  });

  it("scales burn rate with location cost-of-living index", () => {
    const baseline = calculateQuarterFinance({
      quarter: 1,
      startingSavings: 10000,
      monthlyIncome: 5000,
      monthlyBaseExpenses: 3000,
      costOfLivingIndex: 1.0,
    });

    const highCostCity = calculateQuarterFinance({
      quarter: 1,
      startingSavings: 10000,
      monthlyIncome: 5000,
      monthlyBaseExpenses: 3000,
      costOfLivingIndex: 1.4, // 40% higher living cost
    });

    expect(highCostCity.effectiveMonthlyBurn).toBe(Math.round(3000 * 1.4));
    expect(highCostCity.netQuarterCashFlow).toBeLessThan(baseline.netQuarterCashFlow);
    expect(highCostCity.runwayMonths).toBeLessThan(baseline.runwayMonths);
  });

  it("correctly identifies bankruptcy and zeroes runway when capital is depleted", () => {
    const bankruptResult = calculateQuarterFinance({
      quarter: 1,
      startingSavings: 2000,
      monthlyIncome: 1000,
      monthlyBaseExpenses: 3000, // Monthly deficit: -$2000 -> Quarterly: -$6000
    });

    expect(bankruptResult.endingSavings).toBeLessThanOrEqual(0);
    expect(bankruptResult.isBankrupt).toBe(true);
    expect(bankruptResult.runwayMonths).toBe(0);
    expect(bankruptResult.financialHealthScore).toBe(0);
  });

  it("simulates full 20 quarters trajectory with cumulative cash progression", () => {
    const trajectory = simulate5YearFinancialTrajectory({
      initialSavings: 15000,
      monthlyIncome: 6000,
      monthlyBaseExpenses: 4000,
      costOfLivingIndex: 1.0,
      annualInflationRate: 0.03,
      annualInvestmentReturn: 0.05,
      quarterlyEventDeltas: {
        4: 5000, // Quarter 4: Annual bonus +$5000
        8: -3000, // Quarter 8: Medical emergency -$3000
        12: 10000, // Quarter 12: Promotion signing bonus +$10000
      },
    });

    expect(trajectory).toHaveLength(20);

    // Verify sequential linking: Starting savings of quarter N equals ending savings of quarter N-1
    for (let i = 1; i < trajectory.length; i++) {
      expect(trajectory[i].startingSavings).toBe(trajectory[i - 1].endingSavings);
    }

    // Net worth must have grown significantly over 5 years
    const finalQuarter = trajectory[19];
    expect(finalQuarter.endingSavings).toBeGreaterThan(15000);
    expect(finalQuarter.quarter).toBe(20);
    expect(finalQuarter.financialHealthScore).toBeGreaterThanOrEqual(75);
  });

  it("passes 100 randomized financial edge-case simulations without NaN or infinite values", () => {
    for (let testCase = 0; testCase < 100; testCase++) {
      const startingSavings = Math.floor(Math.random() * 200000) - 10000;
      const monthlyIncome = Math.floor(Math.random() * 20000);
      const monthlyBaseExpenses = Math.floor(Math.random() * 15000);
      const costOfLivingIndex = 0.5 + Math.random() * 1.5;
      const annualInflationRate = Math.random() * 0.15;
      const eventCashImpact = Math.floor(Math.random() * 40000) - 20000;
      const quarter = Math.floor(Math.random() * 20) + 1;

      const output = calculateQuarterFinance({
        quarter,
        startingSavings,
        monthlyIncome,
        monthlyBaseExpenses,
        costOfLivingIndex,
        annualInflationRate,
        eventCashImpact,
      });

      // Assert invariants
      expect(Number.isNaN(output.endingSavings)).toBe(false);
      expect(Number.isNaN(output.netQuarterCashFlow)).toBe(false);
      expect(Number.isNaN(output.runwayMonths)).toBe(false);
      expect(Number.isNaN(output.financialHealthScore)).toBe(false);
      expect(Number.isFinite(output.endingSavings)).toBe(true);

      // Financial score must strictly remain within [0, 100]
      expect(output.financialHealthScore).toBeGreaterThanOrEqual(0);
      expect(output.financialHealthScore).toBeLessThanOrEqual(100);

      if (output.isBankrupt) {
        expect(output.endingSavings).toBeLessThanOrEqual(0);
        expect(output.financialHealthScore).toBe(0);
      }
    }
  });
});
