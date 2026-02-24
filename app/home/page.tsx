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
  close_time: string;
  i_participated: boolean;
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
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#1e1e1e]">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-bold text-white">Friend Markets</span>
          <span className="text-[10px] text-[#00d4a3] font-mono tracking-widest">FEED</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5">
        <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono mb-3">Open markets</p>

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-700">Loading…</div>
        ) : markets.length === 0 ? (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-12 text-center">
            <p className="text-sm text-zinc-500">No open markets</p>
            <p className="text-xs text-zinc-700 mt-1">
              Join a group or create a market to get started.
            </p>
            <Link
              href="/groups"
              className="inline-block mt-4 h-9 px-4 text-xs font-semibold bg-[#00d4a3] text-black rounded-lg hover:bg-[#00bf95] transition-colors leading-9"
            >
              Go to Groups
            </Link>
          </div>
        ) : (
          <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
            {markets.map((m, i) => (
              <Link
                key={m.id}
                href={`/markets/${m.id}`}
                className={`flex items-center justify-between px-4 py-4 hover:bg-[#111] transition-colors ${
                  i !== 0 ? "border-t border-[#1e1e1e]" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white leading-snug">{m.question}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] font-mono text-zinc-600">{m.group_name}</span>
                    {m.i_participated && (
                      <span className="text-[10px] font-mono text-[#00d4a3]">· You&apos;re in</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-4">
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    {Math.round(m.price_yes * 100)}%
                  </span>
                  <span className="text-[10px] text-zinc-700">
                    {new Date(m.close_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
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
