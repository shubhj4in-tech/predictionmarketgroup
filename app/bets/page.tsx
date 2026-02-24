"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";

interface PastBet {
  id: string;
  group_id: string;
  group_name: string;
  question: string;
  outcome: string | null;
  resolved_at: string | null;
  my_yes_shares: number;
  my_no_shares: number;
  result: string;
  claimed_at: string | null;
  claimed_amount: number | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function BetsPage() {
  const [bets, setBets] = useState<PastBet[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/signin");
    });
  }, []);

  const fetchBets = useCallback(async () => {
    const res = await fetch("/api/me/activity");
    if (res.ok) {
      const data = await res.json();
      setBets(data.past_bets ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchBets(); }, [fetchBets]);

  const won = bets.filter((b) => b.result === "won").length;
  const lost = bets.filter((b) => b.result === "lost").length;
  const totalClaimed = bets.reduce((sum, b) => sum + (b.claimed_amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#1e1e1e]">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-bold text-white">My Bets</span>
          <span className="text-[10px] text-[#00d4a3] font-mono tracking-widest">HISTORY</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5">
        {/* Stats row */}
        {!loading && bets.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="border border-[#1e1e1e] rounded-xl px-3 py-3 text-center">
              <p className="text-lg font-bold text-emerald-400 tabular-nums">{won}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Won</p>
            </div>
            <div className="border border-[#1e1e1e] rounded-xl px-3 py-3 text-center">
              <p className="text-lg font-bold text-red-400 tabular-nums">{lost}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Lost</p>
            </div>
            <div className="border border-[#1e1e1e] rounded-xl px-3 py-3 text-center">
              <p className="text-lg font-bold text-white tabular-nums">{totalClaimed.toFixed(0)}</p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mt-0.5">Claimed</p>
            </div>
          </div>
        )}

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono mb-3">Resolved bets</p>

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-700">Loading…</div>
        ) : bets.length === 0 ? (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-12 text-center">
            <p className="text-sm text-zinc-500">No bets yet</p>
            <p className="text-xs text-zinc-700 mt-1">
              Resolved markets you traded in will appear here.
            </p>
            <Link
              href="/home"
              className="inline-block mt-4 h-9 px-4 text-xs font-semibold bg-[#00d4a3] text-black rounded-lg hover:bg-[#00bf95] transition-colors leading-9"
            >
              Browse markets
            </Link>
          </div>
        ) : (
          <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
            {bets.map((b, i) => (
              <Link
                key={b.id}
                href={`/markets/${b.id}`}
                className={`block px-4 py-3.5 hover:bg-[#111] transition-colors ${
                  i !== 0 ? "border-t border-[#1e1e1e]" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-white leading-snug flex-1">{b.question}</p>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${
                    b.result === "won"
                      ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                      : "text-red-400 border-red-500/30 bg-red-500/10"
                  }`}>
                    {b.result === "won" ? "WON" : "LOST"}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[10px] text-zinc-600">{b.group_name}</span>
                  {b.outcome && (
                    <span className="text-[10px] text-zinc-600">
                      Resolved {b.outcome}
                    </span>
                  )}
                  {b.resolved_at && (
                    <span className="text-[10px] text-zinc-700">{timeAgo(b.resolved_at)}</span>
                  )}
                  {b.claimed_at && (
                    <span className="text-[10px] text-zinc-500 ml-auto">
                      +{Number(b.claimed_amount ?? 0).toFixed(0)} cr
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
