"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

type Action = "signin" | "signup";

const input =
  "w-full h-11 px-3 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00d4a3] transition-colors";

function SignInForm() {
  const [action, setAction] = useState<Action>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/groups");
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);

    if (action === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
      else router.replace("/groups");
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setErr(error.message);
      } else {
        // Auto sign-in after signup (works when email confirmation is disabled)
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) setErr("Account created — please sign in.");
        else router.replace("/groups");
      }
    }
    setLoading(false);
  }

  const authError = searchParams.get("error");

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Wordmark */}
        <div className="mb-10">
          <p className="text-xs text-[#00d4a3] font-mono tracking-widest mb-2">FRIEND MARKETS</p>
          <h1 className="text-2xl font-bold text-white leading-tight">
            Predict with<br />your people.
          </h1>
          <p className="text-sm text-zinc-600 mt-2">Private prediction markets for any group.</p>
        </div>

        {/* Sign in / Sign up tabs */}
        <div className="flex gap-5 mb-6 border-b border-[#1e1e1e]">
          {(["signin", "signup"] as Action[]).map((a) => (
            <button
              key={a}
              onClick={() => { setAction(a); setErr(null); }}
              className={`pb-2.5 text-sm font-medium transition-colors ${
                action === a
                  ? "text-white border-b-2 border-[#00d4a3] -mb-px"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {a === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {(authError || err) && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
            {err ?? "Sign-in failed. Please try again."}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            required
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={input}
            autoComplete="email"
          />
          <input
            type="password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            className={input}
            autoComplete={action === "signin" ? "current-password" : "new-password"}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-1 h-11 w-full bg-[#00d4a3] text-black text-sm font-semibold rounded-lg hover:bg-[#00bf95] disabled:opacity-50 transition-colors"
          >
            {loading ? "…" : action === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {action === "signup" && (
          <p className="text-xs text-zinc-700 text-center mt-4">
            Min 6 characters for password.
          </p>
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
