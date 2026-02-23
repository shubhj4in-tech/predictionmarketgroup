import { ImageResponse } from "next/og";
import { createServiceClient } from "@/lib/supabase/service";
import { priceYes, priceNo } from "@/lib/lmsr/index";

export const runtime = "edge";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ marketId: string }> }
) {
  const { marketId } = await params;

  // Fetch market data (no auth check — OG images are public previews)
  const supabase = createServiceClient();
  const { data: market } = await supabase
    .from("markets")
    .select("question, status, outcome, b_liquidity, q_yes, q_no, group_id")
    .eq("id", marketId)
    .single();

  if (!market) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#f9fafb",
            fontSize: 32,
            color: "#6b7280",
          }}
        >
          Market not found
        </div>
      ),
      { width: 1200, height: 630 }
    );
  }

  const state = {
    b: Number(market.b_liquidity),
    q_yes: Number(market.q_yes),
    q_no: Number(market.q_no),
  };

  const yPct = Math.round(priceYes(state).toNumber() * 100);
  const nPct = 100 - yPct;

  const statusLabel =
    market.status === "resolved"
      ? `Resolved: ${market.outcome}`
      : market.status === "closed"
      ? "Closed"
      : "Live";

  const statusColor =
    market.status === "resolved"
      ? market.outcome === "YES"
        ? "#10b981"
        : "#f43f5e"
      : market.status === "closed"
      ? "#6b7280"
      : "#6366f1";

  // Fetch group name
  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", market.group_id)
    .single();

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
        {/* Header */}
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

        {/* Question */}
        <div
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#111827",
            lineHeight: 1.25,
            flex: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          {market.question.length > 120
            ? market.question.slice(0, 120) + "…"
            : market.question}
        </div>

        {/* Prices */}
        {market.status !== "resolved" ? (
          <div style={{ display: "flex", gap: "24px", marginTop: "40px" }}>
            <div
              style={{
                flex: 1,
                background: "#ecfdf5",
                borderRadius: "20px",
                padding: "20px 28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontSize: 56, fontWeight: 900, color: "#10b981" }}>
                {yPct}%
              </div>
              <div style={{ fontSize: 22, color: "#059669", fontWeight: 700, marginTop: "4px" }}>
                YES
              </div>
            </div>
            <div
              style={{
                flex: 1,
                background: "#fff1f2",
                borderRadius: "20px",
                padding: "20px 28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ fontSize: 56, fontWeight: 900, color: "#f43f5e" }}>
                {nPct}%
              </div>
              <div style={{ fontSize: 22, color: "#e11d48", fontWeight: 700, marginTop: "4px" }}>
                NO
              </div>
            </div>
          </div>
        ) : (
          <div
            style={{
              marginTop: "40px",
              background: market.outcome === "YES" ? "#ecfdf5" : "#fff1f2",
              borderRadius: "20px",
              padding: "20px 28px",
              display: "flex",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                fontSize: 48,
                fontWeight: 900,
                color: market.outcome === "YES" ? "#10b981" : "#f43f5e",
              }}
            >
              {market.outcome}
            </div>
            <div style={{ fontSize: 28, color: "#6b7280" }}>· Resolved</div>
          </div>
        )}

        {/* Status chip */}
        <div
          style={{
            position: "absolute",
            top: "60px",
            right: "60px",
            background: statusColor,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            padding: "6px 16px",
            borderRadius: "999px",
          }}
        >
          {statusLabel}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
