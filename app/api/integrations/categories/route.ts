import { NextResponse } from 'next/server';
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';
import type { ICommerceIntegration } from '@/lib/integrations/commerce/commerce.interface';

export async function GET() {
  try {
    const commerce = (await IntegrationFactory.getIntegration(
      'commerce',
    )) as ICommerceIntegration;

    const categories = await commerce.getCategories();
    const isHealthy = await commerce.healthCheck();

    return NextResponse.json({
      success: true,
      provider: commerce.getConfig().provider,
      healthy: isHealthy,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error('Error fetching categories:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
