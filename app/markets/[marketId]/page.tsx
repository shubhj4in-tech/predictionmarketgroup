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
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

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
      setTradeSuccess(`${data.shares_bought} ${outcome} shares · ${Number(data.cost).toFixed(0)} cr`);
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
        <Header title="Market" backHref="/groups" />
        <div className="flex items-center justify-center py-24 text-sm text-zinc-700">Loading…</div>
      </div>
    );
  }

  if (!market) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Header title="Market" backHref="/groups" />
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
    : market.outcome === "NO" ? market.my_position.no_shares
    : 0 : 0;
  const canClaim = market.status === "resolved" && winningShares > 0 && !market.my_claim;

  const inputClass =
    "w-full h-11 px-3 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00d4a3] transition-colors";
  const textareaClass =
    "w-full px-3 py-2.5 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00d4a3] transition-colors resize-none";

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      <Header
        title={market.status === "open" ? "Market" : market.status === "closed" ? "Closed" : "Resolved"}
        backHref={`/groups/${market.group_id}`}
      />

      <main className="max-w-md mx-auto px-4 py-5 flex flex-col gap-4">

        {/* Question + prices */}
        <div>
          <p className="text-base font-semibold text-white leading-snug mb-4">{market.question}</p>
          {market.description && (
            <p className="text-sm text-zinc-500 mb-4 -mt-2">{market.description}</p>
          )}

          {/* Price bar */}
          <div className="h-1.5 bg-[#1e1e1e] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${yPct}%` }}
            />
          </div>

          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-black text-emerald-400 tabular-nums">{yPct}%</p>
              <p className="text-xs text-zinc-600 mt-0.5 uppercase tracking-wider">Yes</p>
            </div>
            <div className="text-center text-xs text-zinc-600">
              {isOpen ? (
                `Closes ${new Date(market.close_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
              ) : market.status === "resolved" ? (
                <span className={`text-sm font-bold ${market.outcome === "YES" ? "text-emerald-400" : "text-red-400"}`}>
                  Resolved {market.outcome}
                </span>
              ) : "Awaiting resolution"}
            </div>
            <div className="text-right">
              <p className="text-3xl font-black text-red-400 tabular-nums">{nPct}%</p>
              <p className="text-xs text-zinc-600 mt-0.5 uppercase tracking-wider">No</p>
            </div>
          </div>

          {balance !== null && (
            <p className="text-xs text-zinc-700 mt-3 text-center tabular-nums">
              Balance: <span className="text-zinc-500">{Number(balance).toLocaleString()} cr</span>
            </p>
          )}
        </div>

        {/* My position */}
        {market.my_position && (market.my_position.yes_shares > 0 || market.my_position.no_shares > 0) && (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-3">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-2">Your position</p>
            <div className="flex gap-5">
              {market.my_position.yes_shares > 0 && (
                <div>
                  <p className="text-lg font-bold text-emerald-400 tabular-nums">
                    {Number(market.my_position.yes_shares).toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-600">YES shares</p>
                </div>
              )}
              {market.my_position.no_shares > 0 && (
                <div>
                  <p className="text-lg font-bold text-red-400 tabular-nums">
                    {Number(market.my_position.no_shares).toFixed(2)}
                  </p>
                  <p className="text-xs text-zinc-600">NO shares</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Claim winnings */}
        {canClaim && (
          <div className="border border-emerald-500/20 bg-emerald-500/5 rounded-xl px-4 py-3">
            <p className="text-sm font-semibold text-emerald-400 mb-1">You won</p>
            <p className="text-xs text-zinc-500 mb-3">
              {Number(winningShares).toFixed(2)} {market.outcome} shares → {Number(winningShares).toFixed(2)} credits
            </p>
            {claimErr && <p className="text-xs text-red-400 mb-2">{claimErr}</p>}
            <button
              onClick={claimWinnings}
              disabled={claimLoading}
              className="h-9 w-full text-xs font-semibold bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              {claimLoading ? "…" : `Claim ${Number(winningShares).toFixed(2)} credits`}
            </button>
          </div>
        )}

        {market.my_claim && (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-3">
            <p className="text-xs text-zinc-500">
              Claimed {Number(market.my_claim.amount).toFixed(2)} credits
            </p>
          </div>
        )}

        {/* Admin cannot trade */}
        {isOpen && isAdmin && (
          <div className="border border-amber-500/20 bg-amber-500/5 rounded-xl px-4 py-3">
            <p className="text-xs text-amber-400">You’re the group admin — you can’t place bets in this market. Share the market with members to let them trade.</p>
          </div>
        )}

        {/* Share — for group admins: market link + group invite */}
        {isAdmin && (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Share</p>
            {shareMessage && (
              <p className="text-xs text-[#00d4a3] mb-2">{shareMessage}</p>
            )}
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={async () => {
                  const url = typeof window !== "undefined" ? `${window.location.origin}/markets/${marketId}` : "";
                  await navigator.clipboard.writeText(url);
                  setShareMessage("Market link copied!");
                  setTimeout(() => setShareMessage(null), 2000);
                }}
                className="h-9 w-full text-left px-3 text-xs text-zinc-300 bg-[#111] border border-[#222] rounded-lg hover:bg-[#1a1a1a] transition-colors"
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
                  const url = d?.invite_url;
                  if (url) {
                    await navigator.clipboard.writeText(url);
                    setShareMessage("Group invite link copied!");
                    setTimeout(() => setShareMessage(null), 2000);
                  }
                }}
                className="h-9 w-full text-left px-3 text-xs text-zinc-300 bg-[#111] border border-[#222] rounded-lg hover:bg-[#1a1a1a] transition-colors"
              >
                Copy group invite link
              </button>
            </div>
          </div>
        )}

        {/* Trade widget */}
        {canTrade && (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-3">Trade</p>

            {tradeSuccess && (
              <div className="mb-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs text-emerald-400">
                {tradeSuccess}
              </div>
            )}
            {tradeErr && (
              <div className="mb-3 p-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                {tradeErr}
              </div>
            )}

            <form onSubmit={placeTrade} className="flex flex-col gap-3">
              {/* YES/NO toggle */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOutcome("YES")}
                  className={`flex-1 h-11 rounded-lg font-bold text-sm transition-all ${
                    outcome === "YES"
                      ? "bg-emerald-500 text-black"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20"
                  }`}
                >
                  YES · {yPct}%
                </button>
                <button
                  type="button"
                  onClick={() => setOutcome("NO")}
                  className={`flex-1 h-11 rounded-lg font-bold text-sm transition-all ${
                    outcome === "NO"
                      ? "bg-red-500 text-black"
                      : "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                  }`}
                >
                  NO · {nPct}%
                </button>
              </div>

              {/* Amount */}
              <div className="relative">
                <input
                  type="number"
                  required
                  min="1"
                  step="1"
                  placeholder="Credits to spend"
                  value={spend}
                  onChange={(e) => setSpend(e.target.value)}
                  className={inputClass}
                />
                {balance !== null && (
                  <button
                    type="button"
                    onClick={() => setSpend(String(Math.floor(Number(balance))))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#00d4a3] hover:text-white transition-colors"
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
                className={textareaClass}
              />
              <p className="text-right text-[10px] text-zinc-700 -mt-2">{note.length}/240</p>

              <button
                type="submit"
                disabled={tradeLoading}
                className={`h-11 w-full text-sm font-bold rounded-lg transition-colors disabled:opacity-50 ${
                  outcome === "YES"
                    ? "bg-emerald-500 text-black hover:bg-emerald-400"
                    : "bg-red-500 text-black hover:bg-red-400"
                }`}
              >
                {tradeLoading ? "…" : `Buy ${outcome}`}
              </button>
            </form>
          </div>
        )}

        {/* Resolve panel */}
        {canResolve && (
          <div className="border border-[#2a2a2a] rounded-xl px-4 py-4">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Creator</p>
            <p className="text-xs text-zinc-500 mb-3">
              {isPastClose ? "Market closed — select the outcome to resolve." : "Resolve this market early."}
            </p>
            {resolveErr && <p className="text-xs text-red-400 mb-2">{resolveErr}</p>}
            <form onSubmit={resolveMarket} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResolveOutcome("YES")}
                  className={`flex-1 h-10 rounded-lg font-bold text-sm transition-all ${
                    resolveOutcome === "YES"
                      ? "bg-emerald-500 text-black"
                      : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  YES
                </button>
                <button
                  type="button"
                  onClick={() => setResolveOutcome("NO")}
                  className={`flex-1 h-10 rounded-lg font-bold text-sm transition-all ${
                    resolveOutcome === "NO"
                      ? "bg-red-500 text-black"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  NO
                </button>
              </div>
              <button
                type="submit"
                disabled={resolveLoading}
                className="h-10 w-full text-xs font-medium text-zinc-300 border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] disabled:opacity-50 transition-colors"
              >
                {resolveLoading ? "…" : `Resolve as ${resolveOutcome}`}
              </button>
            </form>
          </div>
        )}

        {/* Activity feed */}
        <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e1e1e]">
            <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
              Activity · {market.trades.length}
            </p>
          </div>
          {market.trades.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-zinc-700">
              No trades yet
            </div>
          ) : (
            <div>
              {market.trades.map((t, i) => (
                <div
                  key={t.id}
                  className={`px-4 py-3 ${i !== 0 ? "border-t border-[#1e1e1e]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
                        t.outcome === "YES"
                          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                          : "text-red-400 bg-red-500/10 border border-red-500/20"
                      }`}>
                        {t.outcome}
                      </span>
                      <span className="text-xs text-zinc-400 truncate">{t.display_name}</span>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-zinc-500 tabular-nums">
                        {Number(t.cost).toFixed(0)} cr → {Number(t.shares).toFixed(1)}
                      </p>
                      <p className="text-[10px] text-zinc-700">{timeAgo(t.created_at)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-600 mt-1.5 italic">&ldquo;{t.note}&rdquo;</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
