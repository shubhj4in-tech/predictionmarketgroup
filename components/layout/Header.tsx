"use client";
import Link from "next/link";

interface HeaderProps {
  title: string;
  backHref?: string;
}

export function Header({ title, backHref }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0a0a] border-b border-[#1e1e1e]">
      <div className="max-w-md mx-auto px-4 h-12 flex items-center gap-3">
        {backHref ? (
          <Link
            href={backHref}
            className="flex items-center justify-center w-8 h-8 -ml-1.5 text-zinc-500 hover:text-white transition-colors"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ) : (
          <span className="text-[#00d4a3] font-bold text-sm tracking-tight">FM</span>
        )}
        <span className="flex-1 text-sm font-semibold text-white truncate">{title}</span>
      </div>
    </header>
  );
}
