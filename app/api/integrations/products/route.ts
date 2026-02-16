import { NextRequest, NextResponse } from 'next/server';
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';
import type { ICommerceIntegration } from '@/lib/integrations/commerce/commerce.interface';

/**
 * GET /api/integrations/products
 *
 * Example API route that uses the commerce integration
 * Automatically uses mock or real provider based on configuration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '20');
    const sort = searchParams.get('sort') as any || 'popular';
    const minPrice = searchParams.get('minPrice')
      ? parseFloat(searchParams.get('minPrice')!)
      : undefined;
    const maxPrice = searchParams.get('maxPrice')
      ? parseFloat(searchParams.get('maxPrice')!)
      : undefined;

    // Get commerce integration (automatically selects provider)
    const commerce = await IntegrationFactory.getIntegration('commerce') as ICommerceIntegration;

    // Fetch products
    const products = await commerce.getProducts({
      category,
      limit,
      sort,
      minPrice,
      maxPrice,
      inStock: true,
    });

    // Check integration health
    const isHealthy = await commerce.healthCheck();

    return NextResponse.json({
      success: true,
      provider: commerce.getConfig().provider,
      healthy: isHealthy,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
