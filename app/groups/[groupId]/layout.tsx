import { Suspense } from "react";

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center text-sm text-zinc-600">Loading…</div>}>
      {children}
    </Suspense>
  );
}
