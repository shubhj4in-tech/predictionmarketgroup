"use client";
import { useState, useEffect, useCallback } from "react";
import { use } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";

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

function StatusChip({ status, outcome }: { status: string; outcome: string | null }) {
  if (status === "resolved") {
    return (
      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
        outcome === "YES"
          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          : "text-red-400 border-red-500/30 bg-red-500/10"
      }`}>
        {outcome}
      </span>
    );
  }
  if (status === "closed") {
    return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-zinc-500 border-zinc-700 bg-zinc-800/50">CLOSED</span>;
  }
  return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-[#00d4a3] border-[#00d4a3]/30 bg-[#00d4a3]/10">LIVE</span>;
}

export default function GroupPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const searchParams = useSearchParams();
  const isNewGroup = searchParams.get("new") === "1";
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [markets, setMarkets] = useState<Market[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tab, setTab] = useState<Tab>("markets");
  const [loading, setLoading] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy invite");
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

  useEffect(() => {
    const iv = setInterval(fetchData, 10000);
    return () => clearInterval(iv);
  }, [fetchData]);

  useEffect(() => {
    if (tab === "leaderboard") fetchLeaderboard();
  }, [tab, fetchLeaderboard]);

  async function createInvite(): Promise<string | null> {
    const res = await fetch("/api/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ group_id: groupId }),
    });
    if (res.ok) {
      const d = await res.json();
      setInviteUrl(d.invite_url ?? null);
      setInviteCode(d.code ?? null);
      return d.invite_url ?? null;
    }
    return null;
  }

  async function copyInvite() {
    let url = inviteUrl;
    if (!url) url = await createInvite();
    if (url) {
      await navigator.clipboard.writeText(url);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy invite"), 2000);
    }
  }

  async function copyCode() {
    let code = inviteCode;
    if (!code) { await createInvite(); code = inviteCode; }
    if (code) {
      await navigator.clipboard.writeText(code);
      setCopyLabel("Code copied!");
      setTimeout(() => setCopyLabel("Copy invite"), 2000);
    }
  }

  // When landing after creating a group, fetch invite URL so we can show share card
  useEffect(() => {
    if (isNewGroup && group && group.my_role === "admin") createInvite();
  }, [isNewGroup, group?.id]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      <Header title={group?.name ?? "Group"} backHref="/groups" />

      <main className="max-w-md mx-auto px-4 py-5">
        {/* Share group card — shown after creating a new group */}
        {isNewGroup && group?.my_role === "admin" && (
          <div className="mb-5 p-4 rounded-xl border border-[#00d4a3]/30 bg-[#00d4a3]/5">
            <p className="text-sm font-semibold text-[#00d4a3] mb-1">Share your group</p>
            <p className="text-xs text-zinc-500 mb-3">Share the code or link so others can join and trade.</p>
            {/* Short join code */}
            <div className="flex items-center justify-between bg-[#111] border border-[#222] rounded-lg px-4 py-3 mb-2">
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-widest mb-0.5">Join code</p>
                <p className="text-2xl font-bold text-white font-mono tracking-widest">
                  {inviteCode ?? "······"}
                </p>
              </div>
              <button
                type="button"
                onClick={copyCode}
                className="h-8 px-3 text-xs font-semibold bg-[#00d4a3] text-black rounded-lg hover:bg-[#00bf95] transition-colors"
              >
                Copy code
              </button>
            </div>
            {/* Full invite link */}
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteUrl ?? "Generating…"}
                className="flex-1 h-9 px-3 bg-[#111] border border-[#222] rounded-lg text-xs text-zinc-400 truncate"
              />
              <button
                type="button"
                onClick={copyInvite}
                className="h-9 px-4 text-xs font-semibold border border-[#2a2a2a] text-zinc-300 rounded-lg hover:bg-[#1a1a1a] transition-colors shrink-0"
              >
                {copyLabel}
              </button>
            </div>
          </div>
        )}

        {/* Group header */}
        {group && (
          <div className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-base font-semibold text-white">{group.name}</h1>
              <p className="text-xs text-zinc-600 mt-0.5">
                {group.member_count} {group.member_count === 1 ? "member" : "members"}
                {group.description ? ` · ${group.description}` : ""}
              </p>
            </div>
            <div className="text-right flex-shrink-0 ml-4">
              <p className="text-lg font-bold text-white tabular-nums">
                {group.my_balance.toLocaleString()}
              </p>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider">credits</p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-5 border-b border-[#1e1e1e] mb-5">
          {(["markets", "leaderboard"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-2.5 text-sm font-medium transition-colors ${
                tab === t
                  ? "text-white border-b-2 border-[#00d4a3] -mb-px"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {t === "markets" ? "Markets" : "Leaderboard"}
            </button>
          ))}
          {group?.my_role === "admin" && tab === "markets" && (
            <button
              onClick={copyCode}
              className="ml-auto pb-2.5 text-xs font-mono text-zinc-600 hover:text-[#00d4a3] transition-colors"
            >
              {inviteCode ? `# ${inviteCode}` : "Share code"}
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-700">Loading…</div>
        ) : tab === "markets" ? (
          <>
            <Link
              href={`/groups/${groupId}/markets/new`}
              className="flex items-center justify-center h-10 w-full mb-4 text-xs font-semibold text-black bg-[#00d4a3] rounded-lg hover:bg-[#00bf95] transition-colors"
            >
              + Create market
            </Link>
            {markets.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-zinc-500">No markets yet</p>
                <p className="text-xs text-zinc-700 mt-1">Create the first prediction market.</p>
              </div>
            ) : (
              <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
                {markets.map((m, i) => (
                  <Link
                    key={m.id}
                    href={`/markets/${m.id}`}
                    className={`block px-4 py-3.5 hover:bg-[#111] transition-colors ${
                      i !== 0 ? "border-t border-[#1e1e1e]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <p className="text-sm text-white leading-snug flex-1">{m.question}</p>
                      <StatusChip status={m.status} outcome={m.outcome} />
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-emerald-400">
                        {Math.round(m.price_yes * 100)}%
                      </span>
                      <div className="flex-1 h-1 bg-[#1e1e1e] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${Math.round(m.price_yes * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-red-400">
                        {Math.round(m.price_no * 100)}%
                      </span>
                      <span className="text-xs text-zinc-700">
                        {m.trade_count}t
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            {leaderboard.length === 0 ? (
              <div className="py-16 text-center text-sm text-zinc-700">No data yet</div>
            ) : (
              <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
                {leaderboard.map((entry, i) => (
                  <div
                    key={entry.user_id}
                    className={`flex items-center gap-3 px-4 py-3.5 ${
                      i !== 0 ? "border-t border-[#1e1e1e]" : ""
                    }`}
                  >
                    <span className="text-xs font-mono text-zinc-600 w-5 text-right flex-shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{entry.display_name}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">
                        {entry.total_trades} trades · {entry.markets_won} won
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-white tabular-nums">
                        {Number(entry.balance).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-zinc-700">cr</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
