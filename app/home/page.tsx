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
  if (ms <= 0) return "closing";
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function MarketRow({ m, last }: { m: OpenMarket; last: boolean }) {
  const yPct = Math.round(m.price_yes * 100);
  const soon = new Date(m.close_time).getTime() - Date.now() < 3 * 3600 * 1000;

  return (
    <Link
      href={`/markets/${m.id}`}
      className={`flex items-center gap-3 px-4 py-3.5 active:bg-[#161616] transition-colors ${!last ? "border-b border-[#181818]" : ""}`}
    >
      {/* Left: question + meta */}
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium text-white leading-snug line-clamp-2 mb-2">
          {m.question}
        </p>
        {/* Thin probability bar */}
        <div className="h-[3px] bg-[#1e1e1e] rounded-full overflow-hidden mb-2">
          <div
            className="h-full rounded-full"
            style={{
              width: `${yPct}%`,
              background: yPct >= 50 ? "#10b981" : "#ef4444",
            }}
          />
        </div>
        {/* Meta row */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-zinc-500 font-medium">{m.group_name}</span>
          <span className="text-zinc-700 text-[11px]">·</span>
          <span className="text-[11px] text-zinc-700">{m.trade_count} trades</span>
          <span className="text-zinc-700 text-[11px]">·</span>
          <span className={`text-[11px] ${soon ? "text-amber-500" : "text-zinc-700"}`}>
            {timeLeft(m.close_time)}
          </span>
          {m.i_participated && (
            <>
              <span className="text-zinc-700 text-[11px]">·</span>
              <span className={`text-[11px] font-semibold ${m.my_yes_shares > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {m.my_yes_shares > 0 ? "↑ YES" : "↓ NO"}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right: probability */}
      <div className="flex-shrink-0 text-right w-14">
        <p className={`text-[17px] font-bold tabular-nums leading-none ${yPct >= 50 ? "text-emerald-400" : "text-red-400"}`}>
          {yPct}%
        </p>
        <p className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-wider">YES</p>
      </div>
    </Link>
  );
}

function SkeletonRow({ last }: { last: boolean }) {
  return (
    <div className={`px-4 py-3.5 ${!last ? "border-b border-[#181818]" : ""}`}>
      <div className="h-3.5 bg-[#1a1a1a] rounded w-4/5 mb-2 animate-pulse" />
      <div className="h-3.5 bg-[#1a1a1a] rounded w-3/5 mb-3 animate-pulse" />
      <div className="h-[3px] bg-[#1a1a1a] rounded-full mb-2 animate-pulse" />
      <div className="h-2.5 bg-[#1a1a1a] rounded w-2/5 animate-pulse" />
    </div>
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
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-[#181818]">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">Friend Markets</span>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#00d4a3]" />
            <span className="text-[10px] text-[#00d4a3] font-mono tracking-widest">LIVE</span>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        {loading ? (
          <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
            {[0, 1, 2].map((i) => <SkeletonRow key={i} last={i === 2} />)}
          </div>
        ) : markets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm font-medium text-zinc-400 mb-1">No open markets</p>
            <p className="text-xs text-zinc-600 mb-5">Join a group or create a market to start.</p>
            <Link href="/groups" className="h-10 px-5 text-xs font-semibold bg-[#00d4a3] text-black rounded-lg">
              Go to Groups
            </Link>
          </div>
        ) : (
          <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
            {markets.map((m, i) => (
              <MarketRow key={m.id} m={m} last={i === markets.length - 1} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
