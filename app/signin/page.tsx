"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Suspense } from "react";

function SignInForm() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  // If already signed in, redirect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/groups");
    });
  }, []);

  const authError = searchParams.get("error");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setErr(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📊</div>
          <h1 className="text-2xl font-bold text-gray-900">Polymarket for Friends</h1>
          <p className="text-gray-500 mt-1 text-sm">Private prediction markets for your group</p>
        </div>

        {sent ? (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center">
            <div className="text-4xl mb-3">📧</div>
            <h2 className="font-semibold text-gray-900 mb-1">Check your email</h2>
            <p className="text-sm text-gray-500">
              We sent a magic link to <strong>{email}</strong>.
              <br />
              Click it to sign in.
            </p>
            <button
              onClick={() => setSent(false)}
              className="mt-4 text-xs text-indigo-600 hover:underline"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
          >
            {authError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                Sign-in failed. Please try again.
              </div>
            )}
            {err && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{err}</div>
            )}
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Email address
            </label>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent mb-4"
            />
            <Button type="submit" fullWidth loading={loading}>
              Send magic link
            </Button>
            <p className="text-center text-xs text-gray-400 mt-4">
              No password needed — we&apos;ll email you a one-click sign-in link.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  );
}
