"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface InvitePreview {
  group_id: string;
  group_name: string;
  group_description: string | null;
  member_count: number;
  expires_at: string | null;
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isAlreadyMember, setIsAlreadyMember] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) setError(data.error ?? "Invalid invite");
        else setPreview(data);
        setLoading(false);
      });
  }, [token]);

  async function acceptInvite() {
    if (!userId) {
      router.push(`/signin?next=/invite/${token}`);
      return;
    }
    setJoining(true);
    const res = await fetch(`/api/invites/${token}`, { method: "POST" });
    const data = await res.json();
    setJoining(false);
    if (res.status === 409 && data.code === "already_member") {
      setIsAlreadyMember(true);
      if (preview) router.push(`/groups/${preview.group_id}`);
    } else if (!res.ok) {
      setError(data.error ?? "Failed to join");
    } else {
      router.push(`/groups/${data.group_id}`);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-sm text-zinc-700">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm border border-[#222] rounded-xl p-6 bg-[#111] text-center">
          <p className="text-sm font-semibold text-white mb-1">Invalid invite</p>
          <p className="text-xs text-zinc-500 mb-5">{error}</p>
          <button
            onClick={() => router.push("/groups")}
            className="h-10 w-full text-xs font-medium text-zinc-300 border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
          >
            Go to my groups
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <p className="text-xs text-[#00d4a3] font-mono tracking-widest">FRIEND MARKETS</p>
          <p className="text-sm text-zinc-600 mt-1">You&apos;re invited to join</p>
        </div>

        <div className="border border-[#222] rounded-xl p-6 bg-[#111]">
          <h1 className="text-xl font-bold text-white mb-1">{preview!.group_name}</h1>
          {preview!.group_description && (
            <p className="text-sm text-zinc-500 mb-3">{preview!.group_description}</p>
          )}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-zinc-600">
              {preview!.member_count} {preview!.member_count === 1 ? "member" : "members"}
            </span>
            <span className="text-zinc-800">·</span>
            <span className="text-xs text-zinc-600">Start with <span className="text-white font-medium">1,000 credits</span></span>
          </div>

          {isAlreadyMember ? (
            <button
              onClick={() => router.push(`/groups/${preview!.group_id}`)}
              className="h-11 w-full text-sm font-semibold text-zinc-300 border border-[#2a2a2a] rounded-lg hover:bg-[#1a1a1a] transition-colors"
            >
              Go to group
            </button>
          ) : (
            <>
              <button
                onClick={acceptInvite}
                disabled={joining}
                className="h-11 w-full text-sm font-semibold bg-[#00d4a3] text-black rounded-lg hover:bg-[#00bf95] disabled:opacity-50 transition-colors"
              >
                {joining ? "…" : userId ? "Join group" : "Sign in to join"}
              </button>
              {!userId && (
                <p className="text-center text-xs text-zinc-700 mt-3">
                  You&apos;ll be brought back after signing in.
                </p>
              )}
            </>
          )}
        </div>

        {preview!.expires_at && (
          <p className="text-center text-xs text-zinc-700 mt-4">
            Expires {new Date(preview!.expires_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
