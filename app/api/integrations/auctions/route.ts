import { NextResponse } from 'next/server';
import data from '@/data/christies-demo-api.json';

/**
 * GET /api/integrations/auctions
 * Returns lightweight list of auctions (no lots array populated).
 */
export async function GET() {
  const auctions = (data.auctions as any[]).map((a) => ({
    id: a.id,
    code: a.code,
    title: a.title,
    saleType: a.saleType,
    startDate: a.startDate,
    endDate: a.endDate,
    location: a.location,
    lotCount: Array.isArray(a.lots) ? a.lots.length : 0,
  }));

  return NextResponse.json({ success: true, count: auctions.length, auctions });
}
