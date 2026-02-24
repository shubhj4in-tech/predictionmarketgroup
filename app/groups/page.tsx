"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";

interface Group {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
  role: string;
}

interface OpenMarket {
  id: string;
  group_id: string;
  group_name: string;
  question: string;
  price_yes: number;
  close_time: string;
  i_participated: boolean;
}

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

const input =
  "w-full h-10 px-3 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00d4a3] transition-colors";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [openMarkets, setOpenMarkets] = useState<OpenMarket[]>([]);
  const [pastBets, setPastBets] = useState<PastBet[]>([]);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups ?? []);
    }
    setLoading(false);
  }, []);

  const fetchActivity = useCallback(async () => {
    const res = await fetch("/api/me/activity");
    if (res.ok) {
      const data = await res.json();
      setOpenMarkets(data.open_markets ?? []);
      setPastBets(data.past_bets ?? []);
    }
    setActivityLoading(false);
  }, []);

  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/signin");
    });
  }, [router]);

  // Refetch whenever user navigates to this page so list is up to date (e.g. after creating a group elsewhere)
  useEffect(() => {
    if (pathname === "/groups") {
      setLoading(true);
      setActivityLoading(true);
      fetchGroups();
      fetchActivity();
    }
  }, [pathname, fetchGroups, fetchActivity]);

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(null);
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      setCreateErr(data.error);
    } else {
      router.push(`/groups/${data.group_id}?new=1`);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header title="Groups" />

      <main className="max-w-md mx-auto px-4 py-5 flex flex-col gap-6">
        {/* Open bets — in your groups or you've participated */}
        <section>
          <span className="text-xs text-zinc-600 uppercase tracking-widest font-mono block mb-3">Open bets</span>
          {activityLoading ? (
            <div className="py-8 text-center text-xs text-zinc-700">Loading…</div>
          ) : openMarkets.length === 0 ? (
            <div className="border border-[#1e1e1e] rounded-xl px-4 py-6 text-center">
              <p className="text-sm text-zinc-500">No open markets</p>
              <p className="text-xs text-zinc-700 mt-1">Markets from your groups will show here.</p>
            </div>
          ) : (
            <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
              {openMarkets.map((m, i) => (
                <Link
                  key={m.id}
                  href={`/markets/${m.id}`}
                  className={`flex items-center justify-between px-4 py-3.5 hover:bg-[#111] transition-colors ${
                    i !== 0 ? "border-t border-[#1e1e1e]" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white leading-snug truncate">{m.question}</p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      {m.group_name}
                      {m.i_participated && (
                        <span className="text-[#00d4a3] ml-1">· You’re in</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span className="text-xs font-mono text-emerald-400">
                      {Math.round(m.price_yes * 100)}%
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      {new Date(m.close_time).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <svg className="text-zinc-700" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-600 uppercase tracking-widest font-mono">My groups</span>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="h-8 px-3 text-xs font-medium bg-[#111] border border-[#2a2a2a] text-zinc-300 rounded-lg hover:bg-[#1a1a1a] hover:text-white transition-colors"
          >
            + New group
          </button>
        </div>

        {/* Create group form */}
        {showCreate && (
          <form
            onSubmit={createGroup}
            className="bg-[#111] border border-[#222] rounded-xl p-4 mb-4"
          >
            <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">New group</p>
            {createErr && (
              <p className="text-xs text-red-400 mb-3">{createErr}</p>
            )}
            <div className="flex flex-col gap-2 mb-3">
              <input
                type="text"
                required
                placeholder="Group name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                className={input}
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                className={input}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="h-9 px-4 text-xs text-zinc-500 border border-[#2a2a2a] rounded-lg hover:text-zinc-300 hover:bg-[#1a1a1a] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="flex-1 h-9 text-xs font-semibold bg-[#00d4a3] text-black rounded-lg hover:bg-[#00bf95] disabled:opacity-50 transition-colors"
              >
                {creating ? "…" : "Create"}
              </button>
            </div>
          </form>
        )}

        {/* Groups list */}
        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-700">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-zinc-500">No groups yet</p>
            <p className="text-xs text-zinc-700 mt-1">Create a group to start predicting with friends.</p>
          </div>
        ) : (
          <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
            {groups.map((g, i) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className={`flex items-center justify-between px-4 py-3.5 hover:bg-[#111] transition-colors ${
                  i !== 0 ? "border-t border-[#1e1e1e]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white truncate">{g.name}</p>
                    {g.role === "admin" && (
                      <span className="text-[10px] text-[#00d4a3] font-mono border border-[#00d4a3]/30 px-1.5 py-0.5 rounded">
                        ADMIN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-600 mt-0.5">
                    {g.member_count} {g.member_count === 1 ? "member" : "members"}
                    {g.description ? ` · ${g.description}` : ""}
                  </p>
                </div>
                <svg className="text-zinc-700 flex-shrink-0 ml-3" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        )}

        {/* Past bets — resolved markets you participated in */}
        <section>
          <span className="text-xs text-zinc-600 uppercase tracking-widest font-mono block mb-3">Past bets</span>
          {activityLoading ? (
            <div className="py-8 text-center text-xs text-zinc-700">Loading…</div>
          ) : pastBets.length === 0 ? (
            <div className="border border-[#1e1e1e] rounded-xl px-4 py-6 text-center">
              <p className="text-sm text-zinc-500">No past bets</p>
              <p className="text-xs text-zinc-700 mt-1">Resolved markets you traded in will show here with results.</p>
            </div>
          ) : (
            <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
              {pastBets.map((b, i) => (
                <Link
                  key={b.id}
                  href={`/markets/${b.id}`}
                  className={`block px-4 py-3.5 hover:bg-[#111] transition-colors ${
                    i !== 0 ? "border-t border-[#1e1e1e]" : ""
                  }`}
                >
                  <p className="text-sm text-white leading-snug">{b.question}</p>
                  <p className="text-xs text-zinc-600 mt-0.5">{b.group_name}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                      b.outcome === "YES"
                        ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
                        : "text-red-400 border-red-500/30 bg-red-500/10"
                    }`}>
                      Resolved {b.outcome ?? "—"}
                    </span>
                    <span className={`text-[10px] font-mono ${
                      b.result === "won" ? "text-emerald-400" : b.result === "lost" ? "text-red-400" : "text-zinc-500"
                    }`}>
                      {b.result === "won" ? "You won" : b.result === "lost" ? "You lost" : "—"}
                    </span>
                    {b.claimed_at && (
                      <span className="text-[10px] text-zinc-600">
                        Claimed {Number(b.claimed_amount ?? 0).toFixed(0)} cr
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
