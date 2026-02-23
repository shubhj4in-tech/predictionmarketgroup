"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface HeaderProps {
  title?: string;
  backHref?: string;
}

export function Header({ title, backHref }: HeaderProps) {
  const [email, setEmail] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setEmail(session?.user?.email ?? null);
    });
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/signin");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 bg-white border-b border-gray-100">
      <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2 min-w-0">
          {backHref ? (
            <Link
              href={backHref}
              className="flex items-center justify-center w-9 h-9 -ml-1 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Back"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
          ) : (
            <Link href="/groups" className="text-indigo-600 font-bold text-lg flex-shrink-0">
              📊
            </Link>
          )}
          {title && (
            <span className="font-semibold text-gray-900 truncate">{title}</span>
          )}
        </div>

        {email && (
          <button
            onClick={signOut}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 ml-2"
          >
            Sign out
          </button>
        )}
      </div>
    </header>
  );
}
