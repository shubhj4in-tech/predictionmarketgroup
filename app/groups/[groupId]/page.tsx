"use client";
import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";

interface Market {
  id: string;
  question: string;
  status: string;
  outcome: string | null;
  price_yes: number;
  price_no: number;
  close_time: string;
  trade_count: number;
  created_at: string;
}

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  balance: number;
  total_trades: number;
  markets_won: number;
}

interface GroupDetail {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  my_balance: number;
  my_role: string;
}

type Tab = "markets" | "leaderboard";

function StatusBadge({ status, outcome }: { status: string; outcome: string | null }) {
  if (status === "resolved") {
    return (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${outcome === "YES" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
        {outcome}
      </span>
    );
  }
  if (status === "closed") {
    return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">Closed</span>;
  }
  return <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Live</span>;
}

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<Tab>("markets");
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy invite link");
  const router = useRouter();
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    const [groupRes, marketsRes] = await Promise.all([
      fetch(`/api/groups/${groupId}`),
      fetch(`/api/groups/${groupId}/markets`),
    ]);
    if (groupRes.status === 401) { router.replace("/signin"); return; }
    if (groupRes.status === 403) { router.replace("/groups"); return; }

    if (groupRes.ok) setGroup(await groupRes.json());
    if (marketsRes.ok) {
      const d = await marketsRes.json();
      setMarkets(d.markets ?? []);
    }
    setLoading(false);
  }, [groupId]);

  const fetchLeaderboard = useCallback(async () => {
    const res = await fetch(`/api/groups/${groupId}/leaderboard`);
    if (res.ok) {
      const d = await res.json();
      setLeaderboard(d.leaderboard ?? []);
    }
  }, [groupId]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/signin");
    });
    fetchData();
  }, [fetchData]);

  // Poll markets every 10s
  useEffect(() => {
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    if (tab === "leaderboard") fetchLeaderboard();
  }, [tab, fetchLeaderboard]);

  async function createInvite() {
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId }),
    });
    if (res.ok) {
      const d = await res.json();
      setInviteUrl(d.invite_url);
    }
  }

  async function copyInvite() {
    if (!inviteUrl) {
      await createInvite();
    }
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy invite link"), 2000);
    }
  }

  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title={group?.name ?? "Group"} backHref="/groups" />

      <main className="max-w-md mx-auto px-4 py-4">
        {/* Group header */}
        {group && (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h1 className="font-bold text-gray-900">{group.name}</h1>
                {group.description && (
                  <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  {group.member_count} {group.member_count === 1 ? "member" : "members"}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-gray-400">Your balance</p>
                <p className="font-bold text-gray-900 text-lg">
                  {group.my_balance.toLocaleString()}
                  <span className="text-xs font-normal text-gray-400 ml-1">cr</span>
                </p>
              </div>
            </div>

            {group.my_role === "admin" && (
              <Button
                size="sm"
                variant="secondary"
                onClick={copyInvite}
                className="mt-3 w-full"
              >
                🔗 {copyLabel}
              </Button>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {(["markets", "leaderboard"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 h-9 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {t === "markets" ? "Markets" : "Leaderboard"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : tab === "markets" ? (
          <>
            <Link
              href={`/groups/${groupId}/markets/new`}
              className="flex items-center justify-center gap-2 w-full h-11 bg-indigo-600 text-white rounded-xl font-semibold text-sm mb-4 hover:bg-indigo-700 transition-colors"
            >
              + Create market
            </Link>
            {markets.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
                <div className="text-4xl mb-3">🎯</div>
                <p className="font-semibold text-gray-700 mb-1">No markets yet</p>
                <p className="text-sm text-gray-400">Be the first to create a prediction market!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {markets.map((m) => (
                  <Link
                    key={m.id}
                    href={`/markets/${m.id}`}
                    className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-gray-900 text-sm leading-snug flex-1">
                        {m.question}
                      </p>
                      <StatusBadge status={m.status} outcome={m.outcome} />
                    </div>
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-emerald-600">
                          YES {Math.round(m.price_yes * 100)}%
                        </span>
                        <span className="text-xs text-gray-300">·</span>
                        <span className="text-xs font-semibold text-rose-500">
                          NO {Math.round(m.price_no * 100)}%
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {m.trade_count} trade{m.trade_count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {m.status === "open"
                          ? `Closes ${new Date(m.close_time).toLocaleDateString()}`
                          : m.status === "closed"
                          ? "Awaiting resolution"
                          : "Resolved"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-2">
            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">No data yet</div>
            ) : (
              leaderboard.map((entry, i) => (
                <div
                  key={entry.user_id}
                  className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex items-center gap-3"
                >
                  <span className="text-xl w-8 text-center flex-shrink-0">
                    {medals[i] ?? `${i + 1}`}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {entry.display_name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {entry.total_trades} trade{entry.total_trades !== 1 ? "s" : ""} ·{" "}
                      {entry.markets_won} won
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-gray-900">
                      {Number(entry.balance).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">credits</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
}
