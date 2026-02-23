"use client";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";
import { sharesForSpend, priceYes, priceNo } from "@/lib/lmsr/index";

interface MarketData {
  id: string;
  group_id: string;
  question: string;
  description: string | null;
  status: string;
  outcome: string | null;
  price_yes: number;
  price_no: number;
  b_liquidity: number;
  q_yes: number;
  q_no: number;
  close_time: string;
  resolved_at: string | null;
  created_at: string;
  creator_id: string;
  trades: Trade[];
  my_position: { yes_shares: number; no_shares: number } | null;
  my_claim: { amount: number; claimed_at: string } | null;
  price_history: { price_yes: number; created_at: string }[];
}

interface Trade {
  id: string;
  user_id: string;
  display_name: string;
  outcome: "YES" | "NO";
  shares: number;
  cost: number;
  note: string;
  price_yes_after: number;
  created_at: string;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function PriceBar({ priceYes }: { priceYes: number }) {
  const yPct = Math.round(priceYes * 100);
  const nPct = 100 - yPct;
  return (
    <div className="flex rounded-full overflow-hidden h-2 bg-gray-100">
      <div
        className="bg-emerald-400 transition-all duration-500"
        style={{ width: `${yPct}%` }}
      />
      <div
        className="bg-rose-400 transition-all duration-500"
        style={{ width: `${nPct}%` }}
      />
    </div>
  );
}

export default function MarketPage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = use(params);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // Trade form
  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [spend, setSpend] = useState("");
  const [note, setNote] = useState("");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeErr, setTradeErr] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  // Resolve
  const [resolveOutcome, setResolveOutcome] = useState<"YES" | "NO">("YES");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  // Claim
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);

  const [balance, setBalance] = useState<number | null>(null);

  const router = useRouter();
  const supabase = createClient();

  // Get current user
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/signin"); return; }
      setUserId(session.user.id);
    });
  }, []);

  const fetchMarket = useCallback(async () => {
    const res = await fetch(`/api/markets/${marketId}`);
    if (res.status === 401) { router.replace("/signin"); return; }
    if (res.status === 403) { router.replace("/groups"); return; }
    if (res.ok) {
      const data: MarketData = await res.json();
      setMarket(data);
      // Fetch wallet balance
      const walletRes = await fetch(`/api/groups/${data.group_id}`);
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setBalance(walletData.my_balance);
      }
    }
    setLoading(false);
  }, [marketId]);

  useEffect(() => { fetchMarket(); }, [fetchMarket]);
  useEffect(() => {
    const iv = setInterval(fetchMarket, 10000);
    return () => clearInterval(iv);
  }, [fetchMarket]);

  // Estimated shares (live calc)
  const estimatedShares = (() => {
    if (!market || !spend || isNaN(Number(spend)) || Number(spend) <= 0) return null;
    try {
      const s = sharesForSpend(
        { b: market.b_liquidity, q_yes: market.q_yes, q_no: market.q_no },
        outcome,
        Number(spend)
      );
      return s.toDecimalPlaces(2).toNumber();
    } catch { return null; }
  })();

  async function placeTrade(e: React.FormEvent) {
    e.preventDefault();
    setTradeErr(null);
    setTradeSuccess(null);
    setTradeLoading(true);

    const res = await fetch(`/api/markets/${marketId}/trade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, spend: Number(spend), note }),
    });
    const data = await res.json();
    setTradeLoading(false);

    if (!res.ok) {
      setTradeErr(data.error ?? "Trade failed");
    } else {
      setTradeSuccess(
        `Bought ${data.shares_bought} ${outcome} shares for ${Number(data.cost).toFixed(2)} credits`
      );
      setSpend("");
      setNote("");
      setBalance(data.wallet_balance_after);
      fetchMarket();
    }
  }

  async function resolveMarket(e: React.FormEvent) {
    e.preventDefault();
    setResolveErr(null);
    setResolveLoading(true);
    const res = await fetch(`/api/markets/${marketId}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome: resolveOutcome }),
    });
    const data = await res.json();
    setResolveLoading(false);
    if (!res.ok) setResolveErr(data.error);
    else fetchMarket();
  }

  async function claimWinnings() {
    setClaimErr(null);
    setClaimLoading(true);
    const res = await fetch(`/api/claims/${marketId}`, { method: "POST" });
    const data = await res.json();
    setClaimLoading(false);
    if (!res.ok) setClaimErr(data.error);
    else { setBalance(data.wallet_balance_after); fetchMarket(); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Market" backHref="/groups" />
        <div className="flex items-center justify-center py-24 text-gray-400 text-sm">Loading…</div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header title="Market" backHref="/groups" />
        <div className="text-center py-24 text-gray-400">Market not found</div>
      </div>
    );
  }

  const isCreator = userId === market.creator_id;
  const isPastClose = new Date(market.close_time) <= new Date();
  const isOpen = market.status === "open" && !isPastClose;
  const canResolve = isCreator && market.status !== "resolved";
  const yPct = Math.round(market.price_yes * 100);
  const nPct = 100 - yPct;

  const winningShares = market.my_position
    ? market.outcome === "YES"
      ? market.my_position.yes_shares
      : market.outcome === "NO"
      ? market.my_position.no_shares
      : 0
    : 0;
  const canClaim =
    market.status === "resolved" &&
    winningShares > 0 &&
    !market.my_claim;

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <Header
        title={market.status === "open" ? "Live Market" : market.status === "closed" ? "Closed" : "Resolved"}
        backHref={`/groups/${market.group_id}`}
      />

      <main className="max-w-md mx-auto px-4 py-4 flex flex-col gap-4">

        {/* Question card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <p className="font-bold text-gray-900 text-base leading-snug">{market.question}</p>
          {market.description && (
            <p className="text-sm text-gray-500 mt-1.5">{market.description}</p>
          )}

          <div className="mt-4">
            <PriceBar priceYes={market.price_yes} />
          </div>

          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-3xl font-black text-emerald-500">{yPct}%</p>
              <p className="text-xs text-gray-400 font-medium">YES</p>
            </div>
            <div className="text-center text-xs text-gray-400">
              {isOpen ? (
                <>Closes {new Date(market.close_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>
              ) : market.status === "resolved" ? (
                <span className={`font-bold text-sm ${market.outcome === "YES" ? "text-emerald-600" : "text-rose-500"}`}>
                  Resolved {market.outcome}
                </span>
              ) : (
                "Closed — awaiting resolution"
              )}
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-rose-500">{nPct}%</p>
              <p className="text-xs text-gray-400 font-medium">NO</p>
            </div>
          </div>

          {balance !== null && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              Your balance: <span className="font-semibold text-gray-600">{Number(balance).toLocaleString()} credits</span>
            </p>
          )}
        </div>

        {/* My position */}
        {market.my_position &&
          (market.my_position.yes_shares > 0 || market.my_position.no_shares > 0) && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Your position</p>
            <div className="flex gap-4">
              {market.my_position.yes_shares > 0 && (
                <div>
                  <p className="text-lg font-bold text-emerald-600">
                    {Number(market.my_position.yes_shares).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">YES shares</p>
                </div>
              )}
              {market.my_position.no_shares > 0 && (
                <div>
                  <p className="text-lg font-bold text-rose-500">
                    {Number(market.my_position.no_shares).toFixed(2)}
                  </p>
                  <p className="text-xs text-gray-400">NO shares</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Claim winnings */}
        {canClaim && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4 shadow-sm">
            <p className="font-semibold text-emerald-800 mb-1">🎉 You won!</p>
            <p className="text-sm text-emerald-700 mb-3">
              Claim {Number(winningShares).toFixed(2)} credits for your{" "}
              {market.outcome} shares.
            </p>
            {claimErr && <p className="text-sm text-red-500 mb-2">{claimErr}</p>}
            <Button
              variant="yes"
              fullWidth
              loading={claimLoading}
              onClick={claimWinnings}
            >
              Claim {Number(winningShares).toFixed(2)} credits
            </Button>
          </div>
        )}

        {/* Already claimed */}
        {market.my_claim && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
            <p className="text-sm text-emerald-700">
              ✅ Claimed {Number(market.my_claim.amount).toFixed(2)} credits
            </p>
          </div>
        )}

        {/* Trade widget */}
        {isOpen && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Place a trade</p>

            {tradeSuccess && (
              <div className="mb-3 p-3 bg-emerald-50 text-emerald-700 rounded-xl text-sm">
                ✅ {tradeSuccess}
              </div>
            )}
            {tradeErr && (
              <div className="mb-3 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{tradeErr}</div>
            )}

            <form onSubmit={placeTrade} className="flex flex-col gap-3">
              {/* YES/NO toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOutcome("YES")}
                  className={`flex-1 h-12 rounded-xl font-bold text-base transition-all ${
                    outcome === "YES"
                      ? "bg-emerald-500 text-white shadow-sm"
                      : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  }`}
                >
                  YES {yPct}%
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome("NO")}
                  className={`flex-1 h-12 rounded-xl font-bold text-base transition-all ${
                    outcome === "NO"
                      ? "bg-rose-500 text-white shadow-sm"
                      : "bg-rose-50 text-rose-600 hover:bg-rose-100"
                  }`}
                >
                  NO {nPct}%
                </button>
              </div>

              {/* Spend amount */}
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="Credits to spend"
                  value={spend}
                  onChange={(e) => setSpend(e.target.value)}
                  className="w-full h-11 pl-3 pr-16 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                {balance !== null && (
                  <button
                    type="button"
                    onClick={() => setSpend(String(Math.floor(Number(balance))))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-indigo-500 font-semibold"
                  >
                    Max
                  </button>
                )}
              </div>

              {/* Estimated shares */}
              {estimatedShares !== null && (
                <p className="text-sm text-gray-500 -mt-1 pl-1">
                  ≈ <span className="font-semibold text-gray-700">{estimatedShares}</span>{" "}
                  {outcome} shares
                </p>
              )}

              {/* Note/rationale */}
              <textarea
                required
                placeholder="Your rationale (required, 1–240 chars)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={240}
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              />
              <p className="text-right text-xs text-gray-400 -mt-2">{note.length}/240</p>

              <Button
                type="submit"
                variant={outcome === "YES" ? "yes" : "no"}
                fullWidth
                size="lg"
                loading={tradeLoading}
              >
                Buy {outcome}
              </Button>
            </form>
          </div>
        )}

        {/* Resolve panel */}
        {canResolve && (
          <div className="bg-white rounded-2xl border border-amber-200 p-5 shadow-sm">
            <p className="text-xs font-semibold text-amber-600 uppercase tracking-wide mb-1">
              Creator panel
            </p>
            <p className="text-sm text-gray-600 mb-3">
              {isPastClose
                ? "This market has closed. Resolve it by selecting the outcome."
                : "You can resolve this market early."}
            </p>
            {resolveErr && (
              <p className="text-sm text-red-500 mb-2">{resolveErr}</p>
            )}
            <form onSubmit={resolveMarket} className="flex flex-col gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResolveOutcome("YES")}
                  className={`flex-1 h-11 rounded-xl font-bold transition-all ${
                    resolveOutcome === "YES"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setResolveOutcome("NO")}
                  className={`flex-1 h-11 rounded-xl font-bold transition-all ${
                    resolveOutcome === "NO"
                      ? "bg-rose-500 text-white"
                      : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                  }`}
                >
                  NO
                </button>
              </div>
              <Button
                type="submit"
                variant="secondary"
                fullWidth
                loading={resolveLoading}
              >
                Resolve as {resolveOutcome}
              </Button>
            </form>
          </div>
        )}

        {/* Trades feed */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Activity ({market.trades.length})
            </p>
          </div>
          {market.trades.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400">
              No trades yet — be the first!
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {market.trades.map((t) => (
                <div key={t.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                          t.outcome === "YES"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-rose-100 text-rose-600"
                        }`}
                      >
                        {t.outcome}
                      </span>
                      <span className="text-xs text-gray-500 truncate">{t.display_name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className="text-xs text-gray-500">
                        {Number(t.cost).toFixed(0)} cr → {Number(t.shares).toFixed(1)} shares
                      </span>
                      <p className="text-xs text-gray-400">{timeAgo(t.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 italic">&ldquo;{t.note}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
