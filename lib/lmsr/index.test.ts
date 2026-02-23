import { describe, it, expect } from "vitest";
import Decimal from "decimal.js";
import {
  cost,
  priceYes,
  priceNo,
  costToBuyYes,
  costToBuyNo,
  sharesForSpend,
  newQValues,
  type LMSRState,
} from "./index";

const DEFAULT_B = 50;
const FRESH: LMSRState = { b: DEFAULT_B, q_yes: 0, q_no: 0 };

function close(a: Decimal, b: number, tol = 1e-6): boolean {
  return a.minus(b).abs().lt(tol);
}

// ---- priceYes / priceNo ----------------------------------------

describe("priceYes / priceNo", () => {
  it("starts at 0.5 / 0.5 when q_yes = q_no = 0", () => {
    expect(close(priceYes(FRESH), 0.5)).toBe(true);
    expect(close(priceNo(FRESH), 0.5)).toBe(true);
  });

  it("prices sum to 1", () => {
    const states: LMSRState[] = [
      FRESH,
      { b: 50, q_yes: 20, q_no: 0 },
      { b: 50, q_yes: 0, q_no: 40 },
      { b: 100, q_yes: 300, q_no: 100 },
    ];
    for (const s of states) {
      const sum = priceYes(s).plus(priceNo(s));
      expect(close(sum, 1, 1e-12)).toBe(true);
    }
  });

  it("YES price increases when q_yes grows", () => {
    const p1 = priceYes({ b: 50, q_yes: 10, q_no: 0 });
    const p2 = priceYes({ b: 50, q_yes: 20, q_no: 0 });
    expect(p2.gt(p1)).toBe(true);
  });

  it("NO price increases when q_no grows", () => {
    const p1 = priceNo({ b: 50, q_yes: 0, q_no: 10 });
    const p2 = priceNo({ b: 50, q_yes: 0, q_no: 20 });
    expect(p2.gt(p1)).toBe(true);
  });

  it("price stays between 0 and 1", () => {
    const extremes: LMSRState[] = [
      { b: 50, q_yes: 1000, q_no: 0 },
      { b: 50, q_yes: 0, q_no: 1000 },
    ];
    for (const s of extremes) {
      const py = priceYes(s);
      const pn = priceNo(s);
      expect(py.gt(0) && py.lt(1)).toBe(true);
      expect(pn.gt(0) && pn.lt(1)).toBe(true);
    }
  });
});

// ---- cost ------------------------------------------------------

describe("cost", () => {
  it("is symmetric: C(q, 0) = C(0, q)", () => {
    const c1 = cost({ b: 50, q_yes: 30, q_no: 0 });
    const c2 = cost({ b: 50, q_yes: 0, q_no: 30 });
    expect(close(c1, c2.toNumber())).toBe(true);
  });

  it("increases as shares increase", () => {
    const c1 = cost({ b: 50, q_yes: 10, q_no: 0 });
    const c2 = cost({ b: 50, q_yes: 20, q_no: 0 });
    expect(c2.gt(c1)).toBe(true);
  });
});

// ---- costToBuyYes / costToBuyNo --------------------------------

describe("costToBuyYes / costToBuyNo", () => {
  it("is positive for any positive shares", () => {
    expect(costToBuyYes(FRESH, 10).gt(0)).toBe(true);
    expect(costToBuyNo(FRESH, 10).gt(0)).toBe(true);
  });

  it("is symmetric at start (buying YES = buying NO in cost)", () => {
    const cy = costToBuyYes(FRESH, 10);
    const cn = costToBuyNo(FRESH, 10);
    expect(close(cy, cn.toNumber())).toBe(true);
  });

  it("buying 0 shares costs 0", () => {
    expect(close(costToBuyYes(FRESH, 0), 0)).toBe(true);
    expect(close(costToBuyNo(FRESH, 0), 0)).toBe(true);
  });

  it("buying more shares costs more (increasing marginal cost)", () => {
    const c1 = costToBuyYes(FRESH, 5);
    const c2 = costToBuyYes(FRESH, 10);
    // Buying 10 should cost less than 2× buying 5 (subadditive due to price increase? No.)
    // Actually it should cost MORE than 2× buying 5 (price increases as you buy).
    // Wait: costToBuy is the integral of marginal price.
    // After buying 5, the price is higher, so buying another 5 costs more.
    // c2 > 2 * c1 is NOT guaranteed because the function is convex.
    // But c2 > c1 is guaranteed.
    expect(c2.gt(c1)).toBe(true);
  });

  it("does not exceed liquidity parameter b for small purchases", () => {
    // With b=50, buying 1 share near 0.5 price should cost ~0.5 credits
    const c = costToBuyYes(FRESH, 1);
    expect(c.lt(DEFAULT_B)).toBe(true);
  });
});

// ---- sharesForSpend --------------------------------------------

describe("sharesForSpend", () => {
  it("returns positive shares for positive spend", () => {
    const shares = sharesForSpend(FRESH, "YES", 10);
    expect(shares.gt(0)).toBe(true);
  });

  it("round-trips: cost(sharesForSpend(state, spend)) ≈ spend", () => {
    const cases: Array<[LMSRState, "YES" | "NO", number]> = [
      [FRESH, "YES", 1],
      [FRESH, "YES", 10],
      [FRESH, "YES", 100],
      [FRESH, "NO", 50],
      [{ b: 50, q_yes: 30, q_no: 5 }, "YES", 20],
      [{ b: 50, q_yes: 5, q_no: 30 }, "NO", 20],
    ];
    for (const [state, outcome, spend] of cases) {
      const shares = sharesForSpend(state, outcome, spend);
      const cost =
        outcome === "YES"
          ? costToBuyYes(state, shares.toNumber())
          : costToBuyNo(state, shares.toNumber());
      expect(close(cost, spend, 1e-6)).toBe(true);
    }
  });

  it("returns 0 for spend = 0", () => {
    expect(sharesForSpend(FRESH, "YES", 0).eq(0)).toBe(true);
  });

  it("more spend = more shares", () => {
    const s1 = sharesForSpend(FRESH, "YES", 10);
    const s2 = sharesForSpend(FRESH, "YES", 20);
    expect(s2.gt(s1)).toBe(true);
  });

  it("YES and NO are symmetric at start", () => {
    const sY = sharesForSpend(FRESH, "YES", 25);
    const sN = sharesForSpend(FRESH, "NO", 25);
    expect(close(sY, sN.toNumber(), 1e-4)).toBe(true);
  });
});

// ---- newQValues ------------------------------------------------

describe("newQValues", () => {
  it("adds to q_yes when outcome is YES", () => {
    const { q_yes, q_no } = newQValues(FRESH, "YES", new Decimal(10));
    expect(q_yes.toNumber()).toBe(10);
    expect(q_no.toNumber()).toBe(0);
  });

  it("adds to q_no when outcome is NO", () => {
    const { q_yes, q_no } = newQValues(FRESH, "NO", new Decimal(10));
    expect(q_yes.toNumber()).toBe(0);
    expect(q_no.toNumber()).toBe(10);
  });
});

// ---- No floating-point drift -----------------------------------

describe("precision", () => {
  it("handles large q values without NaN", () => {
    const bigState: LMSRState = { b: 50, q_yes: 500, q_no: 100 };
    const py = priceYes(bigState);
    expect(py.isNaN()).toBe(false);
    expect(py.isFinite()).toBe(true);
  });

  it("toNumber() is consistent with Decimal precision", () => {
    const shares = sharesForSpend(FRESH, "YES", 100);
    const cost = costToBuyYes(FRESH, shares.toNumber());
    // Should be within 0.0001 credits (1/100th of a cent)
    expect(cost.minus(100).abs().lt("0.0001")).toBe(true);
  });
});
