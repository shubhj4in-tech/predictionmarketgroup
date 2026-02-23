"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

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
    // Check auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });

    // Fetch invite preview (no auth required)
    fetch(`/api/invites/${token}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Invalid invite");
        } else {
          setPreview(data);
        }
        setLoading(false);
      });
  }, [token]);

  async function acceptInvite() {
    if (!userId) {
      // Redirect to sign in, then back
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
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center">
        <div className="text-gray-400 text-sm">Loading invite…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-8 text-center shadow-sm">
          <div className="text-4xl mb-3">❌</div>
          <h2 className="font-semibold text-gray-800 mb-1">Invalid invite</h2>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <Button variant="secondary" onClick={() => router.push("/groups")} fullWidth>
            Go to my groups
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-sm text-gray-500">You&apos;re invited to join</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
          <h1 className="text-xl font-bold text-gray-900 mb-1">{preview!.group_name}</h1>
          {preview!.group_description && (
            <p className="text-sm text-gray-500 mb-3">{preview!.group_description}</p>
          )}
          <p className="text-sm text-gray-500 mb-6">
            {preview!.member_count} {preview!.member_count === 1 ? "member" : "members"} ·
            {" "}Start with <strong>1,000 credits</strong>
          </p>

          {isAlreadyMember ? (
            <Button variant="secondary" fullWidth onClick={() => router.push(`/groups/${preview!.group_id}`)}>
              Go to group →
            </Button>
          ) : (
            <>
              <Button
                fullWidth
                size="lg"
                loading={joining}
                onClick={acceptInvite}
              >
                {userId ? "Join group" : "Sign in to join"}
              </Button>
              {!userId && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  You&apos;ll be brought back here after signing in.
                </p>
              )}
            </>
          )}
        </div>

        {preview!.expires_at && (
          <p className="text-center text-xs text-gray-400 mt-4">
            Invite expires {new Date(preview!.expires_at).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
