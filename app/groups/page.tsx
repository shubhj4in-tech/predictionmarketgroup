"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";

interface Group {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  created_at: string;
  role: string;
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const [createErr, setCreateErr] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function fetchGroups() {
    const res = await fetch("/api/groups");
    if (res.ok) {
      const data = await res.json();
      setGroups(data.groups ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/signin");
    });
    fetchGroups();
  }, []);

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
      router.push(`/groups/${data.group_id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="My Groups" />

      <main className="max-w-md mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Groups</h2>
          <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
            + New group
          </Button>
        </div>

        {/* Create group form */}
        {showCreate && (
          <form
            onSubmit={createGroup}
            className="bg-white rounded-2xl border border-gray-100 p-4 mb-4 shadow-sm"
          >
            <h3 className="font-semibold text-sm mb-3 text-gray-800">New Group</h3>
            {createErr && (
              <p className="text-sm text-red-500 mb-2">{createErr}</p>
            )}
            <input
              type="text"
              required
              placeholder="Group name (e.g. CS106B friends)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-2"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-3"
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" loading={creating} fullWidth>
                Create
              </Button>
            </div>
          </form>
        )}

        {/* Groups list */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
        ) : groups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🎯</div>
            <p className="font-semibold text-gray-700 mb-1">No groups yet</p>
            <p className="text-sm text-gray-400">Create a group to start making markets with friends.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:border-indigo-200 hover:shadow-md transition-all flex items-center justify-between"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{g.name}</p>
                  {g.description && (
                    <p className="text-xs text-gray-400 truncate mt-0.5">{g.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {g.member_count} {g.member_count === 1 ? "member" : "members"}
                    {g.role === "admin" && (
                      <span className="ml-2 text-indigo-500">Admin</span>
                    )}
                  </p>
                </div>
                <svg
                  className="text-gray-300 flex-shrink-0 ml-3"
                  width="20"
                  height="20"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
