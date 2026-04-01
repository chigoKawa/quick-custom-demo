import { NextRequest, NextResponse } from 'next/server';
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';
import type { IPmsIntegration } from '@/lib/integrations/pms/pms.interface';

/**
 * GET /api/integrations/properties/[id]
 *
 * Returns full property detail including room types, availability, rates, and offers
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pms = await IntegrationFactory.getIntegration('pms') as IPmsIntegration;

    const property = await pms.getProperty(id);

    if (!property) {
      return NextResponse.json(
        { success: false, error: `Property not found: ${id}` },
        { status: 404 }
      );
    }

    const isHealthy = await pms.healthCheck();

    return NextResponse.json({
      success: true,
      provider: pms.getConfig().provider,
      healthy: isHealthy,
      property,
    });
  } catch (error) {
    console.error('Error fetching property:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
