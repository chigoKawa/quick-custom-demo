import { NextRequest, NextResponse } from 'next/server';
import data from '@/data/christies-demo-api.json';

/**
 * GET /api/integrations/auctions/:id
 * Returns single auction with full lot objects populated.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const auction = (data.auctions as any[]).find((a) => a.id === id);

  if (!auction) {
    return NextResponse.json({ success: false, error: 'Auction not found' }, { status: 404 });
  }

  const lots = (auction.lots as string[]).map(
    (lotId) => (data.lots as Record<string, any>)[lotId] ?? null
  ).filter(Boolean);

  return NextResponse.json({ success: true, auction: { ...auction, lots } });
}
