import { BaseIntegration } from '../core/base-integration';
import type {
  ICommerceIntegration,
  Product,
  ProductCategory,
  ProductFilters,
  Cart,
  CartItem,
  Order,
} from './commerce.interface';
import { loadMockData } from '../core/config-loader';

/**
 * Mock Commerce Adapter
 * Simulates a commerce backend with realistic delays and behavior
 */
export class MockCommerceAdapter extends BaseIntegration implements ICommerceIntegration {
  private products: Product[] = [];
  private carts: Map<string, Cart> = new Map();
  private orders: Map<string, Order> = new Map();

  async initialize(): Promise<void> {
    await super.initialize();

    // Load mock product data
    try {
      this.products = await loadMockData<Product[]>('products.json');
  
      this.log('info', `Loaded ${this.products.length} mock products`);
    } catch (error) {
      this.log('warn', 'No mock products file found, using empty catalog');
      this.products = [];
    }
  }

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    await this.simulateLatency();

    let filtered = [...this.products];

    if (filters) {
      // Apply category filter
      if (filters.category) {
        // Resolve legacy cat-* aliases used by some Contentful category entries
        const categoryAliases: Record<string, string> = {
          'cat-pots-planters': 'outdoor-pots',
          'cat-outdoor-lighting': 'leisure-outdoor',
          'cat-storage': 'outdoor-storage',
        };
        const resolvedCategory = categoryAliases[filters.category] ?? filters.category;
        filtered = filtered.filter((p) => p.category === resolvedCategory);
      }

      // Apply tags filter
      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter((p) =>
          filters.tags!.some((tag) => p.tags?.includes(tag))
        );
      }

      // Apply price filters
      if (filters.minPrice !== undefined) {
        filtered = filtered.filter((p) => p.price >= filters.minPrice!);
      }
      if (filters.maxPrice !== undefined) {
        filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
      }

      // Apply stock filter
      if (filters.inStock) {
        filtered = filtered.filter((p) => p.stock > 0);
      }

      // Apply sorting
      if (filters.sort) {
        switch (filters.sort) {
          case 'price_asc':
            filtered.sort((a, b) => a.price - b.price);
            break;
          case 'price_desc':
            filtered.sort((a, b) => b.price - a.price);
            break;
          case 'popular':
            filtered.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0));
            break;
          case 'newest':
            // Assume products are already sorted by newest
            break;
        }
      }

      // Apply pagination
      if (filters.offset !== undefined) {
        filtered = filtered.slice(filters.offset);
      }
      if (filters.limit !== undefined) {
        filtered = filtered.slice(0, filters.limit);
      }
    }

    return filtered;
  }

  async getCategories(): Promise<ProductCategory[]> {
    await this.simulateLatency();

    const counts = new Map<string, number>();
    for (const p of this.products) {
      if (p.category) {
        counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
      }
    }

    return Array.from(counts.entries())
      .map(([id, productCount]) => ({
        id,
        name: id
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        slug: id,
        productCount,
      }))
      .sort((a, b) => b.productCount - a.productCount);
  }

  async getProduct(id: string): Promise<Product | null> {
    await this.simulateLatency();

    const product = this.products.find((p) => p.id === id);
    return product || null;
  }

  async addToCart(item: CartItem): Promise<Cart> {
    await this.simulateLatency();

    // Use session-based cart ID (in real app, this would come from session)
    const cartId = 'default-cart';

    let cart = this.carts.get(cartId);

    if (!cart) {
      cart = {
        id: cartId,
        items: [],
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        currency: 'USD',
      };
    }

    // Check if product exists
    const product = await this.getProduct(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    // Check if item already in cart
    const existingItem = cart.items.find((i) => i.productId === item.productId);

    if (existingItem) {
      existingItem.quantity += item.quantity;
    } else {
      cart.items.push(item);
    }

    // Recalculate totals
    cart = this.recalculateCart(cart);

    this.carts.set(cartId, cart);

    return cart;
  }

  async getCart(cartId?: string): Promise<Cart | null> {
    await this.simulateLatency();

    const id = cartId || 'default-cart';
    return this.carts.get(id) || null;
  }

  async removeFromCart(cartId: string, productId: string): Promise<Cart> {
    await this.simulateLatency();

    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    cart.items = cart.items.filter((item) => item.productId !== productId);

    const updatedCart = this.recalculateCart(cart);
    this.carts.set(cartId, updatedCart);

    return updatedCart;
  }

  async updateCartItem(cartId: string, productId: string, quantity: number): Promise<Cart> {
    await this.simulateLatency();

    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    const item = cart.items.find((i) => i.productId === productId);
    if (!item) {
      throw new Error(`Product not in cart: ${productId}`);
    }

    if (quantity <= 0) {
      return this.removeFromCart(cartId, productId);
    }

    item.quantity = quantity;

    const updatedCart = this.recalculateCart(cart);
    this.carts.set(cartId, updatedCart);

    return updatedCart;
  }

  async checkout(cartId: string, customerData: any): Promise<Order> {
    await this.simulateLatency();

    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    if (cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Create order
    const order: Order = {
      id: `order-${Date.now()}`,
      customerId: customerData.customerId || 'guest',
      items: cart.items,
      total: cart.total,
      currency: cart.currency,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(order.id, order);

    // Clear cart
    this.carts.delete(cartId);

    return order;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    await this.simulateLatency();

    return this.orders.get(orderId) || null;
  }

  async getOrders(customerId: string): Promise<Order[]> {
    await this.simulateLatency();

    return Array.from(this.orders.values()).filter(
      (order) => order.customerId === customerId
    );
  }

  async applyDiscount(cartId: string, code: string): Promise<Cart> {
    await this.simulateLatency();

    const cart = this.carts.get(cartId);
    if (!cart) {
      throw new Error(`Cart not found: ${cartId}`);
    }

    // Simple mock discount logic
    const discounts: Record<string, number> = {
      SAVE10: 0.1,
      SAVE20: 0.2,
      FREESHIP: 0,
    };

    const discount = discounts[code];
    if (discount === undefined) {
      throw new Error('Invalid discount code');
    }

    if (discount > 0) {
      cart.subtotal = cart.subtotal * (1 - discount);
      cart.total = cart.subtotal + cart.tax + cart.shipping;
    } else if (code === 'FREESHIP') {
      cart.shipping = 0;
      cart.total = cart.subtotal + cart.tax;
    }

    this.carts.set(cartId, cart);

    return cart;
  }

  /**
   * Helper method to recalculate cart totals
   */
  private recalculateCart(cart: Cart): Cart {
    let subtotal = 0;

    for (const item of cart.items) {
      const product = this.products.find((p) => p.id === item.productId);
      if (product) {
        subtotal += product.price * item.quantity;
      }
    }

    const tax = subtotal * 0.08; // 8% tax
    const shipping = subtotal > 50 ? 0 : 5.99; // Free shipping over $50
    const total = subtotal + tax + shipping;

    return {
      ...cart,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      shipping: Math.round(shipping * 100) / 100,
      total: Math.round(total * 100) / 100,
    };
  }
}
