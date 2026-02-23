import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/service";
import { priceYes } from "@/lib/lmsr/index";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ marketId: string }>;
}): Promise<Metadata> {
  const { marketId } = await params;
  const supabase = createServiceClient();
  const { data: market } = await supabase
    .from("markets")
    .select("question, status, outcome, b_liquidity, q_yes, q_no, group_id")
    .eq("id", marketId)
    .single();

  if (!market) return { title: "Market — Polymarket for Friends" };

  const state = {
    b: Number(market.b_liquidity),
    q_yes: Number(market.q_yes),
    q_no: Number(market.q_no),
  };
  const yPct = Math.round(priceYes(state).toNumber() * 100);
  const nPct = 100 - yPct;

  const { data: group } = await supabase
    .from("groups")
    .select("name")
    .eq("id", market.group_id)
    .single();

  const description =
    market.status === "resolved"
      ? `Resolved ${market.outcome}`
      : `YES ${yPct}% · NO ${nPct}%`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return {
    title: `${market.question} — ${group?.name ?? "Polymarket for Friends"}`,
    description,
    openGraph: {
      title: market.question,
      description,
      images: [
        {
          url: `${appUrl}/api/og/market/${marketId}`,
          width: 1200,
          height: 630,
          alt: market.question,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: market.question,
      description,
      images: [`${appUrl}/api/og/market/${marketId}`],
    },
  };
}

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return children;
}
