import type { IBaseIntegration } from '../core/types';

/**
 * PMS Property data structure
 */
export interface PmsProperty {
  id: string;
  name: string;
  slug: string;
  city: string;
  address: string;
  postcode: string;
  heroImageUrl: string;
  galleryImageUrls: string[];
  shortDescription?: string;
  description?: string;
  amenities?: string[];
  totalRooms?: number;
  rating?: number;
  metadata?: Record<string, any>;
}

/**
 * Room type data structure
 */
export interface PmsRoomType {
  id: string;
  propertyId: string;
  name: string;
  bedType: string;
  sizeSqm: number;
  occupancy: number;
  pricePerWeek: number;
  currency: string;
  amenities: string[];
  bookingMode: 'INSTANT' | 'APPLICATION' | 'WAITLIST' | 'ENQUIRY_ONLY';
  imageUrl?: string;
}

/**
 * Availability data structure
 */
export interface PmsAvailability {
  id: string;
  roomTypeId: string;
  propertyId: string;
  startDate: string;
  endDate: string;
  available: boolean;
  spotsRemaining?: number;
}

/**
 * Rate data structure
 */
export interface PmsRate {
  id: string;
  roomTypeId: string;
  propertyId: string;
  pricePerWeek: number;
  currency: string;
  validFrom: string;
  validTo: string;
}

/**
 * Offer data structure
 */
export interface PmsOffer {
  id: string;
  propertyId: string;
  name: string;
  description: string;
  offerType: 'DISCOUNT' | 'INCENTIVE' | 'EARLY_BIRD' | 'BUNDLE';
  value: number;
  valueType: 'PERCENT' | 'FIXED';
  currency?: string;
  validFrom: string;
  validTo: string;
}

/**
 * Booking session data structure
 */
export interface PmsBookingSession {
  id: string;
  url: string;
  roomTypeId: string;
  startDate: string;
  endDate: string;
  expiresAt?: string;
}

/**
 * Extended property detail with related data
 */
export interface PmsPropertyDetail extends PmsProperty {
  roomTypes: PmsRoomType[];
  availability: PmsAvailability[];
  rates: PmsRate[];
  offers: PmsOffer[];
}

/**
 * Filters for property search
 */
export interface PmsPropertyFilters {
  city?: string;
  limit?: number;
}

/**
 * PMS Integration Interface
 * All PMS adapters must implement this interface
 */
export interface IPmsIntegration extends IBaseIntegration {
  /**
   * Get list of properties with optional filters
   */
  getProperties(filters?: PmsPropertyFilters): Promise<PmsProperty[]>;

  /**
   * Get a single property by ID with full detail
   */
  getProperty(id: string): Promise<PmsPropertyDetail | null>;

  /**
   * Create a booking session for a room type
   */
  createBookingSession(
    roomTypeId: string,
    startDate: string,
    endDate: string
  ): Promise<PmsBookingSession>;
}
