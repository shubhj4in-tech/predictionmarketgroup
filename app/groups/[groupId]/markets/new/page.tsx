"use client";
import { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/Button";

export default function NewMarketPage({ params }: { params: Promise<{ groupId: string }> }) {
  const { groupId } = use(params);
  const [question, setQuestion] = useState("");
  const [description, setDescription] = useState("");
  const [closeDate, setCloseDate] = useState("");
  const [closeTime, setCloseTime] = useState("23:59");
  const [bLiquidity, setBLiquidity] = useState(50);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  // Min date = tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().slice(0, 10);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!closeDate) { setErr("Please set a closing date"); return; }

    const close_time = new Date(`${closeDate}T${closeTime}`).toISOString();

    setLoading(true);
    const res = await fetch(`/api/groups/${groupId}/markets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: question.trim(),
        description: description.trim() || undefined,
        close_time,
        b_liquidity: bLiquidity,
      }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setErr(data.error);
    } else {
      router.push(`/markets/${data.market_id}`);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="New Market" backHref={`/groups/${groupId}`} />

      <main className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          {err && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">{err}</div>
          )}

          {/* Question */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Market question <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              placeholder="Will Shubh get an A in CS106B this quarter?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              minLength={10}
              maxLength={200}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
            <p className="text-right text-xs text-gray-400 mt-0.5">{question.length}/200</p>
          </div>

          {/* Description */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Description <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="Any additional context or resolution criteria…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
            />
          </div>

          {/* Close date/time */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">
              Closes at <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                required
                min={minDate}
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="flex-1 h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className="w-28 h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          {/* Liquidity */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-800 mb-1">
              Liquidity parameter: <span className="text-indigo-600">{bLiquidity}</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">
              Higher = gentler price movement. 50 is good for most markets.
            </p>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={bLiquidity}
              onChange={(e) => setBLiquidity(Number(e.target.value))}
              className="w-full accent-indigo-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-0.5">
              <span>10 (volatile)</span>
              <span>200 (stable)</span>
            </div>
          </div>

          <Button type="submit" fullWidth loading={loading} size="lg">
            Create market
          </Button>
        </form>
      </main>
    </div>
  );
}
