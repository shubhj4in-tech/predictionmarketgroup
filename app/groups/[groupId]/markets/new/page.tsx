"use client";
import { useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";

const input =
  "w-full h-11 px-3 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00d4a3] transition-colors";

const textarea =
  "w-full px-3 py-2.5 bg-[#111] border border-[#222] rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#00d4a3] transition-colors resize-none";

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
    if (!res.ok) setErr(data.error);
    else router.push(`/markets/${data.market_id}`);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Header title="New Market" backHref={`/groups/${groupId}`} />

      <main className="max-w-md mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {err && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
              {err}
            </div>
          )}

          {/* Question */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Question <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              placeholder="Will X happen by Y date?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              minLength={10}
              maxLength={200}
              rows={3}
              className={textarea}
            />
            <p className="text-right text-xs text-zinc-700 mt-1">{question.length}/200</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Description <span className="text-zinc-700">(optional)</span>
            </label>
            <textarea
              placeholder="Resolution criteria, context…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              className={textarea}
            />
          </div>

          {/* Close date/time */}
          <div>
            <label className="block text-xs text-zinc-500 uppercase tracking-wider mb-2">
              Closes at <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                required
                min={minDate}
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className={`${input} flex-1`}
              />
              <input
                type="time"
                value={closeTime}
                onChange={(e) => setCloseTime(e.target.value)}
                className={`${input} w-28`}
              />
            </div>
          </div>

          {/* Liquidity */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-zinc-500 uppercase tracking-wider">
                Liquidity
              </label>
              <span className="text-xs font-mono text-[#00d4a3]">{bLiquidity}</span>
            </div>
            <input
              type="range"
              min={10}
              max={200}
              step={10}
              value={bLiquidity}
              onChange={(e) => setBLiquidity(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-zinc-700 mt-1">
              <span>10 — volatile</span>
              <span>200 — stable</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full bg-[#00d4a3] text-black text-sm font-semibold rounded-lg hover:bg-[#00bf95] disabled:opacity-50 transition-colors mt-1"
          >
            {loading ? "Creating…" : "Create market"}
          </button>
        </form>
      </main>
    </div>
  );
}
