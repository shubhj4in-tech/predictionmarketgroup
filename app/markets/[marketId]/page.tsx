// Phase 4: Market detail page
export default function MarketPage({ params }: { params: { marketId: string } }) {
  return <div className="p-6">Market {params.marketId} — Phase 4</div>;
}
