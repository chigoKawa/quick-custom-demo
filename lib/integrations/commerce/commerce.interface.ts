import type { IBaseIntegration } from '../core/types';

/**
 * Product data structure
 */
export interface Product {
  id: string;
  title: string;
  slug: string;
  sku?: string;
  description?: string;
  price: number;
  currency: string;
  images: string[];
  category?: string;
  tags?: string[];
  stock: number;
  rating?: number;
  reviewCount?: number;
  metadata?: Record<string, any>;
}

/**
 * Cart item structure
 */
export interface CartItem {
  productId: string;
  quantity: number;
  variant?: string;
}

/**
 * Cart structure
 */
export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  currency: string;
}

/**
 * Order structure
 */
export interface Order {
  id: string;
  customerId?: string;
  items: CartItem[];
  total: number;
  currency: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Product filters for searching/filtering
 */
export interface ProductFilters {
  category?: string;
  tags?: string[];
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  limit?: number;
  offset?: number;
  sort?: 'price_asc' | 'price_desc' | 'popular' | 'newest';
}

/**
 * Product category derived from commerce data
 */
export interface ProductCategory {
  id: string;
  name: string;
  slug: string;
  productCount: number;
}

/**
 * Commerce Integration Interface
 * All commerce adapters must implement this interface
 */
export interface ICommerceIntegration extends IBaseIntegration {
  /**
   * Get available product categories (derived from product data)
   */
  getCategories(): Promise<ProductCategory[]>;

  /**
   * Get list of products with optional filters
   */
  getProducts(filters?: ProductFilters): Promise<Product[]>;

  /**
   * Get a single product by ID
   */
  getProduct(id: string): Promise<Product | null>;

  /**
   * Add item to cart
   */
  addToCart(item: CartItem): Promise<Cart>;

  /**
   * Get current cart
   */
  getCart(cartId?: string): Promise<Cart | null>;

  /**
   * Remove item from cart
   */
  removeFromCart(cartId: string, productId: string): Promise<Cart>;

  /**
   * Update cart item quantity
   */
  updateCartItem(cartId: string, productId: string, quantity: number): Promise<Cart>;

  /**
   * Proceed to checkout
   */
  checkout(cartId: string, customerData: any): Promise<Order>;

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Promise<Order | null>;

  /**
   * Get orders for a customer
   */
  getOrders(customerId: string): Promise<Order[]>;

  /**
   * Apply discount code
   */
  applyDiscount(cartId: string, code: string): Promise<Cart>;
}
