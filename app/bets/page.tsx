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

interface Profile {
  email: string;
  display_name: string | null;
  username: string | null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : email[0].toUpperCase();
  return (
    <div className="w-14 h-14 rounded-full bg-[#00d4a3]/15 border border-[#00d4a3]/30 flex items-center justify-center flex-shrink-0">
      <span className="text-lg font-bold text-[#00d4a3]">{initials}</span>
    </div>
  );
}

const inputCls = "w-full h-10 px-3 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00d4a3] transition-colors";

export default function BetsPage() {
  const [bets, setBets] = useState<PastBet[]>([]);
  const [betsLoading, setBetsLoading] = useState(true);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/signin");
    });
  }, []);

  const fetchProfile = useCallback(async () => {
    const res = await fetch("/api/me/profile");
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setEditName(data.display_name ?? "");
      setEditUsername(data.username ?? "");
    }
  }, []);

  const fetchBets = useCallback(async () => {
    const res = await fetch("/api/me/activity");
    if (res.ok) {
      const data = await res.json();
      setBets(data.past_bets ?? []);
    }
    setBetsLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
    fetchBets();
  }, [fetchProfile, fetchBets]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaveErr(null);
    setSaving(true);
    const res = await fetch("/api/me/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ display_name: editName, username: editUsername }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setSaveErr(data.error ?? "Failed to save");
    } else {
      await fetchProfile();
      setEditing(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/signin");
  }

  const won = bets.filter((b) => b.result === "won").length;
  const lost = bets.filter((b) => b.result === "lost").length;
  const totalClaimed = bets.reduce((sum, b) => sum + (b.claimed_amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#1e1e1e]">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-bold text-white">Profile</span>
          <button
            onClick={signOut}
            className="text-xs text-zinc-600 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5">

        {/* Profile section */}
        {profile && !editing && (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-4 mb-5">
            <div className="flex items-center gap-4 mb-4">
              <Avatar name={profile.display_name} email={profile.email} />
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-white truncate">
                  {profile.display_name ?? "No name set"}
                </p>
                {profile.username && (
                  <p className="text-xs text-[#00d4a3] font-mono">@{profile.username}</p>
                )}
                <p className="text-xs text-zinc-600 mt-0.5 truncate">{profile.email}</p>
              </div>
              <button
                onClick={() => setEditing(true)}
                className="h-8 px-3 text-xs text-zinc-500 border border-[#2a2a2a] rounded-lg hover:text-white hover:bg-[#1a1a1a] transition-colors shrink-0"
              >
                Edit
              </button>
            </div>
          </div>
        )}

        {/* Edit profile form */}
        {editing && (
          <form onSubmit={saveProfile} className="border border-[#1e1e1e] rounded-xl px-4 py-4 mb-5">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Edit profile</p>
            {saveErr && <p className="text-xs text-red-400 mb-3">{saveErr}</p>}
            <div className="flex flex-col gap-2 mb-3">
              <input
                type="text"
                placeholder="Display name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={60}
                className={inputCls}
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">@</span>
                <input
                  type="text"
                  placeholder="username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  maxLength={30}
                  className={`${inputCls} pl-7`}
                />
              </div>
              <p className="text-[10px] text-zinc-700">Letters, numbers, underscores only</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setEditing(false); setSaveErr(null); }}
                className="h-9 px-4 text-xs text-zinc-500 border border-[#2a2a2a] rounded-lg hover:text-zinc-300 hover:bg-[#1a1a1a] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 h-9 text-xs font-semibold bg-[#00d4a3] text-black rounded-lg hover:bg-[#00bf95] disabled:opacity-50 transition-colors"
              >
                {saving ? "…" : "Save"}
              </button>
            </div>
          </form>
        )}

        {/* Stats row */}
        {!betsLoading && bets.length > 0 && (
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

        {betsLoading ? (
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
                    <span className="text-[10px] text-zinc-600">Resolved {b.outcome}</span>
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
