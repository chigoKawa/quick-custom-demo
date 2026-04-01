import { NextRequest, NextResponse } from 'next/server';
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';
import type { IPmsIntegration } from '@/lib/integrations/pms/pms.interface';

/**
 * GET /api/integrations/properties
 *
 * Returns list of PMS properties with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const city = searchParams.get('city') || undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam) : undefined;

    const pms = await IntegrationFactory.getIntegration('pms') as IPmsIntegration;

    const properties = await pms.getProperties({ city, limit });

    const isHealthy = await pms.healthCheck();

    return NextResponse.json({
      success: true,
      provider: pms.getConfig().provider,
      healthy: isHealthy,
      count: properties.length,
      properties,
    });
  } catch (error) {
    console.error('Error fetching properties:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
