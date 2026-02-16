import { NextRequest, NextResponse } from 'next/server';
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';
import type { IFormsIntegration } from '@/lib/integrations/forms/forms.interface';

/**
 * GET /api/integrations/forms
 * 
 * Fetch forms from the forms integration
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const category = searchParams.get('category') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const id = searchParams.get('id') || undefined;
    const slug = searchParams.get('slug') || undefined;

    // Get forms integration
    const forms = await IntegrationFactory.getIntegration('forms') as IFormsIntegration;

    // If requesting a specific form by ID
    if (id) {
      const form = await forms.getForm(id);
      if (!form) {
        return NextResponse.json(
          { success: false, error: 'Form not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        form,
      });
    }

    // If requesting a specific form by slug
    if (slug) {
      const form = await forms.getFormBySlug(slug);
      if (!form) {
        return NextResponse.json(
          { success: false, error: 'Form not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        form,
      });
    }

    // Fetch all forms with filters
    const formsList = await forms.getForms({
      category,
      limit,
    });

    // Check integration health
    const isHealthy = await forms.healthCheck();

    return NextResponse.json({
      success: true,
      healthy: isHealthy,
      count: formsList.length,
      forms: formsList,
    });
  } catch (error) {
    console.error('Error fetching forms:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/integrations/forms
 * 
 * Submit a form
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { formId, data } = body;

    if (!formId) {
      return NextResponse.json(
        { success: false, error: 'formId is required' },
        { status: 400 }
      );
    }

    if (!data || typeof data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'data object is required' },
        { status: 400 }
      );
    }

    // Get forms integration
    const forms = await IntegrationFactory.getIntegration('forms') as IFormsIntegration;

    // Submit the form
    const submission = await forms.submitForm(formId, data);

    return NextResponse.json({
      success: true,
      submission,
    });
  } catch (error) {
    console.error('Error submitting form:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
