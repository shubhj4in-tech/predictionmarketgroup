// Next.js file-based OG image — auto-served at /markets/[marketId]/opengraph-image
// See: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/opengraph-image
import { ImageResponse } from "next/og";
import { createServiceClient } from "@/lib/supabase/service";
import { priceYes } from "@/lib/lmsr/index";

export const runtime = "edge";
export const alt = "Prediction market";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: { marketId: string };
}) {
  const supabase = createServiceClient();
  const { data: market } = await supabase
    .from("markets")
    .select("question, status, outcome, b_liquidity, q_yes, q_no, group_id")
    .eq("id", params.marketId)
    .single();

  const question = market?.question ?? "Prediction Market";
  const state = market
    ? { b: Number(market.b_liquidity), q_yes: Number(market.q_yes), q_no: Number(market.q_no) }
    : { b: 50, q_yes: 0, q_no: 0 };

  const yPct = Math.round(priceYes(state).toNumber() * 100);
  const nPct = 100 - yPct;

  const { data: group } = market
    ? await supabase.from("groups").select("name").eq("id", market.group_id).single()
    : { data: null };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #eef2ff 0%, #fff 60%)",
          padding: "60px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "32px" }}>
          <div style={{ fontSize: 32 }}>📊</div>
          <div style={{ color: "#6366f1", fontWeight: 700, fontSize: 20 }}>
            Polymarket for Friends
          </div>
          {group && (
            <div style={{ color: "#9ca3af", fontSize: 18, marginLeft: "auto" }}>
              {group.name}
            </div>
          )}
        </div>

        <div
          style={{
            fontSize: 40,
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.25,
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {question.length > 120 ? question.slice(0, 120) + "…" : question}
        </div>

        {market?.status !== "resolved" ? (
          <div style={{ display: "flex", gap: "24px", marginTop: "40px" }}>
            <div style={{ flex: 1, background: "#ecfdf5", borderRadius: "20px", padding: "20px 28px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: "#10b981" }}>{yPct}%</div>
              <div style={{ fontSize: 22, color: "#059669", fontWeight: 700 }}>YES</div>
            </div>
            <div style={{ flex: 1, background: "#fff1f2", borderRadius: "20px", padding: "20px 28px", display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 56, fontWeight: 900, color: "#f43f5e" }}>{nPct}%</div>
              <div style={{ fontSize: 22, color: "#e11d48", fontWeight: 700 }}>NO</div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: "40px", background: market.outcome === "YES" ? "#ecfdf5" : "#fff1f2", borderRadius: "20px", padding: "20px 28px", display: "flex", alignItems: "center", gap: "16px" }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: market.outcome === "YES" ? "#10b981" : "#f43f5e" }}>{market.outcome}</div>
            <div style={{ fontSize: 28, color: "#6b7280" }}>· Resolved</div>
          </div>
        )}
      </div>
    ),
    { ...size }
  );
}
