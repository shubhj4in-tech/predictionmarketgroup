// Root page — redirect to /groups (or /signin if unauthenticated)
// Full routing logic implemented in Phase 4
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <h1 className="text-3xl font-bold mb-2">Polymarket for Friends</h1>
      <p className="text-gray-500">Private prediction markets for friend groups.</p>
      <p className="mt-4 text-sm text-gray-400">Phase 1 scaffold — UI coming in Phase 4.</p>
    </main>
  );
}
