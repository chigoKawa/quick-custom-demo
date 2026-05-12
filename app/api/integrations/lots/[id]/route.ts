import { NextRequest, NextResponse } from 'next/server';
import data from '@/data/christies-demo-api.json';

/**
 * GET /api/integrations/lots/:id
 * Returns a single lot by ID.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lot = (data.lots as Record<string, any>)[id];

  if (!lot) {
    return NextResponse.json({ success: false, error: 'Lot not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, lot });
}
