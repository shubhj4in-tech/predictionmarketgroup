// ============================================================
// LMSR (Logarithmic Market Scoring Rule) pricing engine
// Uses Decimal.js (precision=28) to prevent float drift.
//
// Cost function:  C(q_yes, q_no) = b * ln(e^(q_yes/b) + e^(q_no/b))
// Price YES:      e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
// Price NO:       1 - priceYes
// ============================================================

import Decimal from "decimal.js";

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type LMSRState = {
  b: number | string;
  q_yes: number | string;
  q_no: number | string;
};

function d(x: number | string): Decimal {
  return new Decimal(x);
}

/** LMSR cost function C(q_yes, q_no) */
export function cost(state: LMSRState): Decimal {
  const b = d(state.b);
  const ey = d(state.q_yes).div(b).exp();
  const en = d(state.q_no).div(b).exp();
  return b.mul(ey.plus(en).ln());
}

/** Current YES probability / price (0–1) */
export function priceYes(state: LMSRState): Decimal {
  const b = d(state.b);
  const ey = d(state.q_yes).div(b).exp();
  const en = d(state.q_no).div(b).exp();
  return ey.div(ey.plus(en));
}

/** Current NO probability / price (0–1) */
export function priceNo(state: LMSRState): Decimal {
  return d(1).minus(priceYes(state));
}

/** Credits required to buy `shares` YES shares */
export function costToBuyYes(state: LMSRState, shares: number | string): Decimal {
  const after: LMSRState = {
    ...state,
    q_yes: d(state.q_yes).plus(d(shares)).toNumber(),
  };
  return cost(after).minus(cost(state));
}

/** Credits required to buy `shares` NO shares */
export function costToBuyNo(state: LMSRState, shares: number | string): Decimal {
  const after: LMSRState = {
    ...state,
    q_no: d(state.q_no).plus(d(shares)).toNumber(),
  };
  return cost(after).minus(cost(state));
}

/**
 * Binary search: how many shares can you buy with exactly `spend` credits?
 *
 * Uses the fact that cost is strictly monotone increasing in shares,
 * so binary search converges reliably.
 */
export function sharesForSpend(
  state: LMSRState,
  outcome: "YES" | "NO",
  spend: number | string,
  maxIter = 100
): Decimal {
  const spendD = d(spend);
  if (spendD.lte(0)) return d(0);

  const costFn =
    outcome === "YES"
      ? (s: Decimal) => costToBuyYes(state, s.toNumber())
      : (s: Decimal) => costToBuyNo(state, s.toNumber());

  // Upper bound: at current price, shares = spend / price (price only increases)
  const currentPrice =
    outcome === "YES" ? priceYes(state) : priceNo(state);
  const priceSafe = currentPrice.lt("0.001") ? d("0.001") : currentPrice;
  let lo = d(0);
  let hi = spendD.div(priceSafe).mul("1.5"); // 1.5× headroom

  for (let i = 0; i < maxIter; i++) {
    const mid = lo.plus(hi).div(2);
    const c = costFn(mid);
    const diff = c.minus(spendD).abs();

    // Converged when cost difference < 1e-9 credits
    if (diff.lt("1e-9")) return mid;

    if (c.lt(spendD)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return lo;
}

/**
 * New q_yes / q_no after a trade (for atomic DB update).
 */
export function newQValues(
  state: LMSRState,
  outcome: "YES" | "NO",
  shares: Decimal
): { q_yes: Decimal; q_no: Decimal } {
  if (outcome === "YES") {
    return {
      q_yes: d(state.q_yes).plus(shares),
      q_no: d(state.q_no),
    };
  }
  return {
    q_yes: d(state.q_yes),
    q_no: d(state.q_no).plus(shares),
  };
}
