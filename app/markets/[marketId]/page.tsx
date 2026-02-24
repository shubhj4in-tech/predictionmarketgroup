"use client";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { sharesForSpend } from "@/lib/lmsr/index";

interface MarketData {
  id: string;
  group_id: string;
  my_role?: string;
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

// ── SVG Price Chart ──────────────────────────────────────────────────────────
function PriceChart({ history, currentPrice }: {
  history: { price_yes: number; created_at: string }[];
  currentPrice: number;
}) {
  const W = 400;
  const H = 96;
  const PX = 0;
  const PY = 8;

  // Need at least 2 points; pad with current price if needed
  const pts = history.length === 0
    ? [{ price_yes: currentPrice }, { price_yes: currentPrice }]
    : history.length === 1
    ? [history[0], { price_yes: currentPrice }]
    : history;

  const prices = pts.map((p) => p.price_yes);
  const rawMin = Math.min(...prices);
  const rawMax = Math.max(...prices);
  const span = rawMax - rawMin;
  const minP = span < 0.08 ? Math.max(0, rawMin - 0.04) : rawMin - span * 0.1;
  const maxP = span < 0.08 ? Math.min(1, rawMax + 0.04) : rawMax + span * 0.1;
  const range = maxP - minP || 0.1;

  const toX = (i: number) => PX + (i / (pts.length - 1)) * (W - PX * 2);
  const toY = (p: number) => H - PY - ((p - minP) / range) * (H - PY * 2);

  const linePts = pts.map((p, i) => `${toX(i)},${toY(p.price_yes)}`).join(" L ");
  const pathD = `M ${linePts}`;
  const areaD = `M ${toX(0)},${H} L ${linePts} L ${toX(pts.length - 1)},${H} Z`;

  const isUp = currentPrice >= 0.5;
  const color = isUp ? "#10b981" : "#ef4444";
  const gradId = `cg_${isUp ? "g" : "r"}`;

  const lastX = toX(pts.length - 1);
  const lastY = toY(currentPrice);

  return (
    <div className="relative w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 96 }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.18" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((f) => {
          const y = PY + (1 - f) * (H - PY * 2);
          return (
            <line
              key={f}
              x1={0} y1={y} x2={W} y2={y}
              stroke="#1e1e1e" strokeWidth="1"
            />
          );
        })}
        {/* Area fill */}
        <path d={areaD} fill={`url(#${gradId})`} />
        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Current price dot */}
        <circle cx={lastX} cy={lastY} r="3.5" fill={color} />
        <circle cx={lastX} cy={lastY} r="6" fill={color} fillOpacity="0.2" />
      </svg>
      {/* Y axis labels */}
      <div className="absolute right-0 top-0 h-full flex flex-col justify-between py-1 pointer-events-none">
        <span className="text-[9px] text-zinc-700 tabular-nums">{Math.round(maxP * 100)}%</span>
        <span className="text-[9px] text-zinc-700 tabular-nums">{Math.round(minP * 100)}%</span>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function MarketPage({ params }: { params: Promise<{ marketId: string }> }) {
  const { marketId } = use(params);
  const [market, setMarket] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [outcome, setOutcome] = useState<"YES" | "NO">("YES");
  const [spend, setSpend] = useState("");
  const [note, setNote] = useState("");
  const [tradeLoading, setTradeLoading] = useState(false);
  const [tradeErr, setTradeErr] = useState<string | null>(null);
  const [tradeSuccess, setTradeSuccess] = useState<string | null>(null);

  const [resolveOutcome, setResolveOutcome] = useState<"YES" | "NO">("YES");
  const [resolveLoading, setResolveLoading] = useState(false);
  const [resolveErr, setResolveErr] = useState<string | null>(null);

  const [claimLoading, setClaimLoading] = useState(false);
  const [claimErr, setClaimErr] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

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
      const walletRes = await fetch(`/api/groups/${data.group_id}`);
      if (walletRes.ok) setBalance((await walletRes.json()).my_balance);
    }
    setLoading(false);
  }, [marketId]);

  useEffect(() => { fetchMarket(); }, [fetchMarket]);
  useEffect(() => {
    const iv = setInterval(fetchMarket, 10000);
    return () => clearInterval(iv);
  }, [fetchMarket]);

  const estimatedShares = (() => {
    if (!market || !spend || isNaN(Number(spend)) || Number(spend) <= 0) return null;
    try {
      return sharesForSpend(
        { b: market.b_liquidity, q_yes: market.q_yes, q_no: market.q_no },
        outcome,
        Number(spend)
      ).toDecimalPlaces(2).toNumber();
    } catch { return null; }
  })();

  async function placeTrade(e: React.FormEvent) {
    e.preventDefault();
    setTradeErr(null); setTradeSuccess(null);
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
      setTradeSuccess(`Bought ${data.shares_bought} ${outcome} shares for ${Number(data.cost).toFixed(0)} cr`);
      setSpend(""); setNote("");
      setBalance(data.wallet_balance_after);
      fetchMarket();
    }
  }

  async function resolveMarket(e: React.FormEvent) {
    e.preventDefault();
    setResolveErr(null); setResolveLoading(true);
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
    setClaimErr(null); setClaimLoading(true);
    const res = await fetch(`/api/claims/${marketId}`, { method: "POST" });
    const data = await res.json();
    setClaimLoading(false);
    if (!res.ok) setClaimErr(data.error);
    else { setBalance(data.wallet_balance_after); fetchMarket(); }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header title="Market" backHref="/home" />
        <div className="flex items-center justify-center py-24 text-sm text-zinc-700">Loading…</div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header title="Market" backHref="/home" />
        <div className="text-center py-24 text-sm text-zinc-700">Market not found</div>
      </div>
    );
  }

  const isCreator = userId === market.creator_id;
  const isAdmin = market.my_role === "admin";
  const isPastClose = new Date(market.close_time) <= new Date();
  const isOpen = market.status === "open" && !isPastClose;
  const canTrade = isOpen && !isAdmin;
  const canResolve = isCreator && market.status !== "resolved";
  const yPct = Math.round(market.price_yes * 100);
  const nPct = 100 - yPct;

  const winningShares = market.my_position
    ? market.outcome === "YES" ? market.my_position.yes_shares
    : market.outcome === "NO" ? market.my_position.no_shares : 0 : 0;
  const canClaim = market.status === "resolved" && winningShares > 0 && !market.my_claim;

  const inp = "w-full h-11 px-3 bg-[#0f0f0f] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#333] transition-colors";
  const ta = "w-full px-3 py-2.5 bg-[#0f0f0f] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:border-[#333] transition-colors resize-none";

  const statusLabel = market.status === "resolved"
    ? `Resolved ${market.outcome}`
    : isPastClose ? "Awaiting resolution"
    : `Closes ${new Date(market.close_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-10">
      <Header title="" backHref={`/groups/${market.group_id}`} />

      <main className="max-w-md mx-auto px-4 pt-3 flex flex-col gap-3">

        {/* ── Hero: question + chart + prices ── */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl overflow-hidden">
          <div className="px-4 pt-4 pb-3">
            {/* Status pill */}
            <div className="flex items-center gap-2 mb-3">
              {isOpen && <span className="h-1.5 w-1.5 rounded-full bg-[#00d4a3]" />}
              <span className={`text-[11px] font-medium ${
                market.status === "resolved"
                  ? market.outcome === "YES" ? "text-emerald-400" : "text-red-400"
                  : isOpen ? "text-[#00d4a3]" : "text-zinc-500"
              }`}>
                {statusLabel}
              </span>
              {balance !== null && (
                <span className="ml-auto text-[11px] text-zinc-600 tabular-nums">
                  {Number(balance).toLocaleString()} cr
                </span>
              )}
            </div>

            {/* Question */}
            <p className="text-[15px] font-semibold text-white leading-snug mb-1">
              {market.question}
            </p>
            {market.description && (
              <p className="text-xs text-zinc-600 mb-3">{market.description}</p>
            )}
          </div>

          {/* Chart */}
          <div className="px-4 pb-1">
            <PriceChart history={market.price_history} currentPrice={market.price_yes} />
          </div>

          {/* Price bar + YES/NO */}
          <div className="px-4 pb-4 pt-2">
            <div className="h-[3px] bg-[#1e1e1e] rounded-full overflow-hidden mb-3">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${yPct}%`, background: "#10b981" }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-emerald-400 tabular-nums">{yPct}%</span>
                <span className="text-xs text-zinc-600">YES</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-zinc-600">NO</span>
                <span className="text-xl font-bold text-red-400 tabular-nums">{nPct}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── My position ── */}
        {market.my_position && (market.my_position.yes_shares > 0 || market.my_position.no_shares > 0) && (
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-4 py-3 flex items-center gap-4">
            <p className="text-[11px] text-zinc-600 uppercase tracking-wider flex-shrink-0">Position</p>
            {market.my_position.yes_shares > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-emerald-400 tabular-nums">
                  {Number(market.my_position.yes_shares).toFixed(2)}
                </span>
                <span className="text-xs text-zinc-600">YES shares</span>
              </div>
            )}
            {market.my_position.no_shares > 0 && (
              <div className="flex items-baseline gap-1">
                <span className="text-sm font-bold text-red-400 tabular-nums">
                  {Number(market.my_position.no_shares).toFixed(2)}
                </span>
                <span className="text-xs text-zinc-600">NO shares</span>
              </div>
            )}
          </div>
        )}

        {/* ── Claim winnings ── */}
        {canClaim && (
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-emerald-400">You won 🎉</p>
              <p className="text-xs text-zinc-500 tabular-nums">{Number(winningShares).toFixed(2)} credits</p>
            </div>
            {claimErr && <p className="text-xs text-red-400 mb-2">{claimErr}</p>}
            <button
              onClick={claimWinnings}
              disabled={claimLoading}
              className="h-10 w-full text-xs font-semibold bg-emerald-500 text-black rounded-lg disabled:opacity-50 transition-colors"
            >
              {claimLoading ? "Claiming…" : `Claim ${Number(winningShares).toFixed(2)} credits`}
            </button>
          </div>
        )}

        {market.my_claim && (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-2.5">
            <p className="text-xs text-zinc-500">
              ✓ Claimed {Number(market.my_claim.amount).toFixed(2)} credits
            </p>
          </div>
        )}

        {/* ── Admin note ── */}
        {isOpen && isAdmin && (
          <div className="border border-[#2a2a2a] rounded-xl px-4 py-3">
            <p className="text-xs text-zinc-500">You're the group admin — members trade, you resolve.</p>
          </div>
        )}

        {/* ── Admin share ── */}
        {isAdmin && (
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-4 py-3">
            <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-2">Share</p>
            {shareMessage && <p className="text-xs text-[#00d4a3] mb-2">{shareMessage}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/markets/${marketId}`;
                  await navigator.clipboard.writeText(url);
                  setShareMessage("Copied!");
                  setTimeout(() => setShareMessage(null), 2000);
                }}
                className="flex-1 h-9 text-xs text-zinc-400 bg-[#161616] border border-[#222] rounded-lg hover:bg-[#1e1e1e] transition-colors"
              >
                Copy market link
              </button>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/api/invites", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ group_id: market.group_id }),
                  });
                  const d = res.ok ? await res.json() : null;
                  if (d?.invite_url) {
                    await navigator.clipboard.writeText(d.invite_url);
                    setShareMessage("Invite copied!");
                    setTimeout(() => setShareMessage(null), 2000);
                  }
                }}
                className="flex-1 h-9 text-xs text-zinc-400 bg-[#161616] border border-[#222] rounded-lg hover:bg-[#1e1e1e] transition-colors"
              >
                Copy invite
              </button>
            </div>
          </div>
        )}

        {/* ── Trade widget ── */}
        {canTrade && (
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-2xl px-4 py-4">
            {tradeSuccess && (
              <div className="mb-3 py-2 px-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                {tradeSuccess}
              </div>
            )}
            {tradeErr && (
              <div className="mb-3 py-2 px-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                {tradeErr}
              </div>
            )}

            <form onSubmit={placeTrade} className="flex flex-col gap-3">
              {/* YES / NO toggle */}
              <div className="flex gap-2 p-1 bg-[#161616] rounded-xl">
                <button
                  type="button"
                  onClick={() => setOutcome("YES")}
                  className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${
                    outcome === "YES"
                      ? "bg-emerald-500 text-black shadow-lg"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  YES · {yPct}%
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome("NO")}
                  className={`flex-1 h-10 rounded-lg text-sm font-bold transition-all ${
                    outcome === "NO"
                      ? "bg-red-500 text-black shadow-lg"
                      : "text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  NO · {nPct}%
                </button>
              </div>

              {/* Amount input */}
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="Credits to spend"
                  value={spend}
                  onChange={(e) => setSpend(e.target.value)}
                  className={inp}
                />
                {balance !== null && (
                  <button
                    type="button"
                    onClick={() => setSpend(String(Math.floor(Number(balance))))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#00d4a3] hover:text-white transition-colors min-h-0"
                  >
                    MAX
                  </button>
                )}
              </div>

              {estimatedShares !== null && (
                <p className="text-xs text-zinc-600 -mt-1 pl-1 tabular-nums">
                  ≈ <span className={outcome === "YES" ? "text-emerald-400" : "text-red-400"}>{estimatedShares}</span>{" "}
                  {outcome} shares
                </p>
              )}

              <textarea
                required
                placeholder="Your rationale (required)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={240}
                rows={2}
                className={ta}
              />

              <button
                type="submit"
                disabled={tradeLoading}
                className={`h-11 w-full text-sm font-bold rounded-xl transition-colors disabled:opacity-50 ${
                  outcome === "YES"
                    ? "bg-emerald-500 text-black"
                    : "bg-red-500 text-black"
                }`}
              >
                {tradeLoading ? "Placing trade…" : `Buy ${outcome}`}
              </button>
            </form>
          </div>
        )}

        {/* ── Resolve panel ── */}
        {canResolve && (
          <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl px-4 py-3">
            <p className="text-[11px] text-zinc-600 uppercase tracking-wider mb-2">
              {isPastClose ? "Resolve market" : "Resolve early"}
            </p>
            {resolveErr && <p className="text-xs text-red-400 mb-2">{resolveErr}</p>}
            <form onSubmit={resolveMarket} className="flex gap-2">
              <button
                type="button"
                onClick={() => setResolveOutcome("YES")}
                className={`flex-1 h-9 rounded-lg text-sm font-bold transition-all ${
                  resolveOutcome === "YES" ? "bg-emerald-500 text-black" : "bg-[#161616] text-zinc-500 border border-[#222]"
                }`}
              >YES</button>
              <button
                type="button"
                onClick={() => setResolveOutcome("NO")}
                className={`flex-1 h-9 rounded-lg text-sm font-bold transition-all ${
                  resolveOutcome === "NO" ? "bg-red-500 text-black" : "bg-[#161616] text-zinc-500 border border-[#222]"
                }`}
              >NO</button>
              <button
                type="submit"
                disabled={resolveLoading}
                className="flex-1 h-9 text-xs font-semibold text-white bg-[#222] rounded-lg disabled:opacity-50 transition-colors"
              >
                {resolveLoading ? "…" : `Resolve ${resolveOutcome}`}
              </button>
            </form>
          </div>
        )}

        {/* ── Activity feed ── */}
        <div className="bg-[#0f0f0f] border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-[#181818] flex items-center justify-between">
            <p className="text-[11px] text-zinc-600 uppercase tracking-wider">Activity</p>
            <p className="text-[11px] text-zinc-700">{market.trades.length} trades</p>
          </div>
          {market.trades.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-700">No trades yet — be the first</div>
          ) : (
            market.trades.map((t, i) => (
              <div key={t.id} className={`px-4 py-3 ${i !== 0 ? "border-t border-[#181818]" : ""}`}>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono flex-shrink-0 ${
                      t.outcome === "YES"
                        ? "text-emerald-400 bg-emerald-500/10"
                        : "text-red-400 bg-red-500/10"
                    }`}>
                      {t.outcome}
                    </span>
                    <span className="text-xs text-zinc-400 truncate">{t.display_name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[11px] text-zinc-600 tabular-nums">
                      {Number(t.cost).toFixed(0)} cr
                    </span>
                    <span className="text-[11px] text-zinc-700">{timeAgo(t.created_at)}</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 italic pl-0.5">&ldquo;{t.note}&rdquo;</p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
