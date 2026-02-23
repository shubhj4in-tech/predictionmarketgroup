// ============================================================
// LMSR (Logarithmic Market Scoring Rule) engine
// Full implementation in Phase 2.
// Uses Decimal.js for precision.
// ============================================================

import Decimal from "decimal.js";

// Set global precision high enough for financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type LMSRState = {
  b: number;    // liquidity parameter
  q_yes: number;
  q_no: number;
};

/**
 * Cost function: C(q) = b * ln(exp(q_yes/b) + exp(q_no/b))
 */
export function cost(state: LMSRState): Decimal {
  const b = new Decimal(state.b);
  const qy = new Decimal(state.q_yes);
  const qn = new Decimal(state.q_no);

  return b.mul(
    Decimal.exp(qy.div(b)).plus(Decimal.exp(qn.div(b))).ln()
  );
}

/**
 * Price of YES shares: exp(q_yes/b) / (exp(q_yes/b) + exp(q_no/b))
 */
export function priceYes(state: LMSRState): Decimal {
  const b = new Decimal(state.b);
  const qy = new Decimal(state.q_yes);
  const qn = new Decimal(state.q_no);

  const ey = Decimal.exp(qy.div(b));
  const en = Decimal.exp(qn.div(b));
  return ey.div(ey.plus(en));
}

/**
 * Price of NO shares: 1 - priceYes
 */
export function priceNo(state: LMSRState): Decimal {
  return new Decimal(1).minus(priceYes(state));
}

/**
 * Cost of buying `shares` YES shares given current state.
 * costToBuy = C(q_yes + shares, q_no) - C(q_yes, q_no)
 */
export function costToBuyYes(state: LMSRState, shares: number): Decimal {
  const after = { ...state, q_yes: state.q_yes + shares };
  return cost(after).minus(cost(state));
}

/**
 * Cost of buying `shares` NO shares given current state.
 */
export function costToBuyNo(state: LMSRState, shares: number): Decimal {
  const after = { ...state, q_no: state.q_no + shares };
  return cost(after).minus(cost(state));
}

/**
 * Binary search: how many shares can you buy with `spend` credits?
 * Returns shares as a Decimal.
 * Phase 2 will wire this up with full validation.
 */
export function sharesForSpend(
  state: LMSRState,
  outcome: "YES" | "NO",
  spend: number,
  tolerance = 1e-9
): Decimal {
  const spendD = new Decimal(spend);
  const costFn =
    outcome === "YES"
      ? (s: number) => costToBuyYes(state, s)
      : (s: number) => costToBuyNo(state, s);

  let lo = 0;
  let hi = spend / 0.001; // upper bound: can't get more shares than 1/min_price
  const MAX_ITER = 100;

  for (let i = 0; i < MAX_ITER; i++) {
    const mid = (lo + hi) / 2;
    const c = costFn(mid);
    if (c.minus(spendD).abs().toNumber() < tolerance) {
      return new Decimal(mid);
    }
    if (c.lt(spendD)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return new Decimal(lo);
}
