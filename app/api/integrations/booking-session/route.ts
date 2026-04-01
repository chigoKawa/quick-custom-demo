import { NextRequest, NextResponse } from 'next/server';
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';
import type { IPmsIntegration } from '@/lib/integrations/pms/pms.interface';

/**
 * GET /api/integrations/booking-session
 *
 * Creates a booking session for a room type
 * Query params: roomTypeId, startDate, endDate
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const roomTypeId = searchParams.get('roomTypeId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!roomTypeId || !startDate || !endDate) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: roomTypeId, startDate, endDate',
        },
        { status: 400 }
      );
    }

    const pms = await IntegrationFactory.getIntegration('pms') as IPmsIntegration;

    const session = await pms.createBookingSession(roomTypeId, startDate, endDate);

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error) {
    console.error('Error creating booking session:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
