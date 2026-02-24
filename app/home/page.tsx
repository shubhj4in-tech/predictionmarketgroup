"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";

interface OpenMarket {
  id: string;
  group_id: string;
  group_name: string;
  question: string;
  price_yes: number;
  price_no: number;
  close_time: string;
  trade_count: number;
  i_participated: boolean;
  my_yes_shares: number;
  my_no_shares: number;
}

function timeLeft(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Closing";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h left`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d left`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isClosingSoon(iso: string): boolean {
  return new Date(iso).getTime() - Date.now() < 3 * 3600 * 1000;
}

function MarketCard({ m }: { m: OpenMarket }) {
  const yPct = Math.round(m.price_yes * 100);
  const nPct = 100 - yPct;
  const soon = isClosingSoon(m.close_time);

  return (
    <Link href={`/markets/${m.id}`} className="block active:opacity-80 transition-opacity">
      <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 active:bg-[#161616] transition-colors">

        {/* Top row: group + time */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-1.5 w-1.5 rounded-full bg-[#00d4a3]">
              <span className="animate-ping absolute h-1.5 w-1.5 rounded-full bg-[#00d4a3] opacity-75" />
            </span>
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{m.group_name}</span>
          </div>
          <span className={`text-[11px] font-mono ${soon ? "text-amber-400" : "text-zinc-600"}`}>
            {timeLeft(m.close_time)}
          </span>
        </div>

        {/* Question */}
        <p className="text-[15px] font-semibold text-white leading-snug mb-4">{m.question}</p>

        {/* Probability bar */}
        <div className="h-2 bg-[#1e1e1e] rounded-full overflow-hidden mb-3">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${yPct}%`,
              background: `linear-gradient(90deg, #10b981 0%, #34d399 100%)`,
            }}
          />
        </div>

        {/* YES / NO percentages */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-emerald-400 tabular-nums leading-none">{yPct}%</span>
            <span className="text-xs text-zinc-600 font-medium">YES</span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xs text-zinc-600 font-medium">NO</span>
            <span className="text-2xl font-black text-red-400 tabular-nums leading-none">{nPct}%</span>
          </div>
        </div>

        {/* Footer: trades + position */}
        <div className="flex items-center justify-between pt-2.5 border-t border-[#1e1e1e]">
          <span className="text-[11px] text-zinc-700 tabular-nums">
            {m.trade_count} {m.trade_count === 1 ? "trade" : "trades"}
          </span>
          {m.i_participated ? (
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              m.my_yes_shares > 0
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-red-400 bg-red-500/10"
            }`}>
              {m.my_yes_shares > 0 ? `You bet YES` : `You bet NO`}
            </span>
          ) : (
            <span className="text-[11px] text-[#00d4a3] font-medium">Tap to trade →</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const [markets, setMarkets] = useState<OpenMarket[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/signin");
    });
  }, []);

  const fetchFeed = useCallback(async () => {
    const res = await fetch("/api/me/activity");
    if (res.ok) {
      const data = await res.json();
      setMarkets(data.open_markets ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchFeed(); }, [fetchFeed]);
  useEffect(() => {
    const iv = setInterval(fetchFeed, 15000);
    return () => clearInterval(iv);
  }, [fetchFeed]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#1e1e1e]">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-base font-bold text-white tracking-tight">Friend Markets</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d4a3] animate-pulse" />
            <span className="text-[11px] text-[#00d4a3] font-mono tracking-widest">LIVE</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3 mt-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-4 animate-pulse">
                <div className="h-3 bg-[#1e1e1e] rounded w-1/3 mb-3" />
                <div className="h-4 bg-[#1e1e1e] rounded w-full mb-2" />
                <div className="h-4 bg-[#1e1e1e] rounded w-3/4 mb-4" />
                <div className="h-2 bg-[#1e1e1e] rounded-full mb-3" />
                <div className="h-6 bg-[#1e1e1e] rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#111] border border-[#1e1e1e] flex items-center justify-center mb-4">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#3f3f3f" strokeWidth="1.5">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-400 mb-1">No open markets</p>
            <p className="text-xs text-zinc-600 mb-5 max-w-[220px]">
              Join a group or create a market to start predicting.
            </p>
            <Link
              href="/groups"
              className="h-11 px-6 text-sm font-semibold bg-[#00d4a3] text-black rounded-xl flex items-center"
            >
              Go to Groups
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {markets.map((m) => <MarketCard key={m.id} m={m} />)}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
