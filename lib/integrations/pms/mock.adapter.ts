import { BaseIntegration } from '../core/base-integration';
import type {
  IPmsIntegration,
  PmsProperty,
  PmsPropertyDetail,
  PmsPropertyFilters,
  PmsRoomType,
  PmsAvailability,
  PmsRate,
  PmsOffer,
  PmsBookingSession,
} from './pms.interface';
import { loadMockData } from '../core/config-loader';

interface MockFixture {
  properties: PmsProperty[];
  roomTypes: PmsRoomType[];
  availability: PmsAvailability[];
  rates: PmsRate[];
  offers: PmsOffer[];
}

/**
 * Mock PMS Adapter
 * Simulates a Property Management System backend with realistic delays and behavior
 */
export class MockPmsAdapter extends BaseIntegration implements IPmsIntegration {
  private properties: PmsProperty[] = [];
  private roomTypes: PmsRoomType[] = [];
  private availability: PmsAvailability[] = [];
  private rates: PmsRate[] = [];
  private offers: PmsOffer[] = [];

  async initialize(): Promise<void> {
    await super.initialize();

    try {
      const fixture = await loadMockData<MockFixture>('properties.json');
      this.properties = fixture.properties || [];
      this.roomTypes = fixture.roomTypes || [];
      this.availability = fixture.availability || [];
      this.rates = fixture.rates || [];
      this.offers = fixture.offers || [];

      this.log('info', `Loaded ${this.properties.length} mock properties`);
    } catch (error) {
      this.log('warn', 'No mock properties file found, using empty data');
      this.properties = [];
    }
  }

  async getProperties(filters?: PmsPropertyFilters): Promise<PmsProperty[]> {
    await this.simulateLatency();

    let filtered = [...this.properties];

    if (filters) {
      if (filters.city) {
        filtered = filtered.filter((p) =>
          p.city.toLowerCase().includes(filters.city!.toLowerCase())
        );
      }

      if (filters.limit !== undefined) {
        filtered = filtered.slice(0, filters.limit);
      }
    }

    return filtered;
  }

  async getProperty(id: string): Promise<PmsPropertyDetail | null> {
    await this.simulateLatency();

    const property = this.properties.find((p) => p.id === id);
    if (!property) return null;

    const roomTypes = this.roomTypes.filter((rt) => rt.propertyId === id);
    const roomTypeIds = roomTypes.map((rt) => rt.id);

    const availability = this.availability.filter(
      (a) => a.propertyId === id || roomTypeIds.includes(a.roomTypeId)
    );

    const rates = this.rates.filter(
      (r) => r.propertyId === id || roomTypeIds.includes(r.roomTypeId)
    );

    const offers = this.offers.filter((o) => o.propertyId === id);

    return {
      ...property,
      roomTypes,
      availability,
      rates,
      offers,
    };
  }

  async createBookingSession(
    roomTypeId: string,
    startDate: string,
    endDate: string
  ): Promise<PmsBookingSession> {
    await this.simulateLatency();

    const sessionId = `mock-session-${Date.now()}`;

    return {
      id: sessionId,
      url: `https://book.example.com/room/${roomTypeId}?start=${startDate}&end=${endDate}&session=${sessionId}`,
      roomTypeId,
      startDate,
      endDate,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    };
  }
}
