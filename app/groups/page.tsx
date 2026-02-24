"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BottomNav } from "@/components/layout/BottomNav";

interface Group {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
  role: string;
}

const input =
  "w-full h-10 px-3 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00d4a3] transition-colors";

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const fetchGroups = useCallback(async () => {
    const res = await fetch("/api/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/signin");
    });
  }, []);

  useEffect(() => {
    if (pathname === "/groups") {
      setLoading(true);
      fetchGroups();
    }
  }, [pathname, fetchGroups]);

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
    <div className="min-h-screen bg-[#0a0a0a] pb-20">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#1e1e1e]">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <span className="text-sm font-bold text-white">Groups</span>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="h-7 px-3 text-xs font-medium bg-[#111] border border-[#2a2a2a] text-zinc-300 rounded-lg hover:bg-[#1a1a1a] hover:text-white transition-colors"
          >
            + New
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-5">
        {/* Create group form */}
        {showCreate && (
          <form
            onSubmit={createGroup}
            className="bg-[#111] border border-[#222] rounded-xl p-4 mb-4"
          >
            <p className="text-xs font-semibold text-zinc-400 mb-3 uppercase tracking-wider">New group</p>
            {createErr && <p className="text-xs text-red-400 mb-3">{createErr}</p>}
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

        <p className="text-xs text-zinc-600 uppercase tracking-widest font-mono mb-3">My groups</p>

        {loading ? (
          <div className="py-16 text-center text-sm text-zinc-700">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="border border-[#1e1e1e] rounded-xl px-4 py-12 text-center">
            <p className="text-sm text-zinc-500">No groups yet</p>
            <p className="text-xs text-zinc-700 mt-1">Create a group to start predicting with friends.</p>
          </div>
        ) : (
          <div className="border border-[#1e1e1e] rounded-xl overflow-hidden">
            {groups.map((g, i) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className={`flex items-center justify-between px-4 py-4 hover:bg-[#111] transition-colors ${
                  i !== 0 ? "border-t border-[#1e1e1e]" : ""
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-base font-semibold text-white truncate">{g.name}</p>
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
      </main>

      <BottomNav />
    </div>
  );
}
