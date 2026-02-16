import { NextRequest, NextResponse } from 'next/server';
import type { IntegrationType } from '@/lib/integrations/core/types';

/**
 * GET /api/integrations/config?type=commerce
 * 
 * Returns the current integration configuration for a given type.
 * In the future, this will fetch app installation parameters from Contentful Management API.
 * For now, it returns the config from the factory (which reads from JSON/env).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as IntegrationType;

    if (!type || !['commerce', 'forms', 'auth', 'search'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing integration type' },
        { status: 400 }
      );
    }

    // TODO: Fetch app installation params from Contentful Management API
    // For now, we'll return a placeholder that indicates the config source
    const response = {
      success: true,
      type,
      source: 'json-file', // Will be 'contentful-app' once apps are installed
      message: 'Install the Contentful App to configure this integration through the UI',
      // In the future, this will include actual app installation parameters
      appParams: null,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching integration config:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
