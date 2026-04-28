import type { IntegrationType, IntegrationProvider, IBaseIntegration } from './types';
import { IntegrationNotFoundError } from './types';
import { loadIntegrationConfig } from './config-loader';

// Import adapters (will be implemented next)
// Commerce
import { MockCommerceAdapter } from '../commerce/mock.adapter';

// Forms
import { MockFormsAdapter } from '../forms/mock.adapter';
import { JotFormAdapter } from '../forms/jotform.adapter';

// Auth
import { MockAuthAdapter } from '../auth/mock.adapter';

// Search
import { MockSearchAdapter } from '../search/mock.adapter';

// PMS
import { MockPmsAdapter } from '../pms/mock.adapter';

/**
 * Integration factory - creates the appropriate adapter based on type and provider
 */
export class IntegrationFactory {
  private static instances = new Map<string, IBaseIntegration>();

  /**
   * Get an integration instance (singleton pattern)
   */
  static async getIntegration(
    type: IntegrationType,
    provider?: IntegrationProvider,
    appParams?: Record<string, any>
  ): Promise<IBaseIntegration> {
    // Load configuration (with optional app params from Contentful App installation)
    const config = await loadIntegrationConfig(type, provider, appParams);

    // Check if using mock mode
    const useMock =
      config.useMock ||
      process.env.USE_MOCK_INTEGRATIONS === 'true' ||
      process.env[`USE_MOCK_${type.toUpperCase()}`] === 'true';

    const finalProvider = useMock ? 'mock' : config.provider;

    // Create cache key
    const cacheKey = `${type}:${finalProvider}`;

    // Return cached instance if exists
    if (this.instances.has(cacheKey)) {
      return this.instances.get(cacheKey)!;
    }

    // Create new instance
    const instance = this.createAdapter(type, finalProvider, config);

    // Initialize the integration
    await instance.initialize();

    // Cache the instance
    this.instances.set(cacheKey, instance);

    return instance;
  }

  /**
   * Create the appropriate adapter based on type and provider
   */
  private static createAdapter(
    type: IntegrationType,
    provider: string,
    config: any
  ): IBaseIntegration {
    switch (type) {
      case 'commerce':
        return this.createCommerceAdapter(provider, config);

      case 'forms':
        return this.createFormsAdapter(provider, config);

      case 'auth':
        return this.createAuthAdapter(provider, config);

      case 'search':
        return this.createSearchAdapter(provider, config);

      case 'pms':
        return this.createPmsAdapter(provider, config);

      default:
        throw new IntegrationNotFoundError(type, provider);
    }
  }

  /**
   * Create commerce adapter
   */
  private static createCommerceAdapter(provider: string, config: any): IBaseIntegration {
    switch (provider) {
      case 'mock':
        return new MockCommerceAdapter({ config });

      // Add real adapters here
      // case 'shopify':
      //   return new ShopifyAdapter({ config });

      default:
        throw new IntegrationNotFoundError('commerce', provider);
    }
  }

  /**
   * Create forms adapter
   */
  private static createFormsAdapter(provider: string, config: any): IBaseIntegration {
    switch (provider) {
      case 'mock':
        return new MockFormsAdapter({ config });

      case 'jotform':
        return new JotFormAdapter({ config });

      // case 'hubspot':
      //   return new HubspotAdapter({ config });

      default:
        throw new IntegrationNotFoundError('forms', provider);
    }
  }

  /**
   * Create auth adapter
   */
  private static createAuthAdapter(provider: string, config: any): IBaseIntegration {
    switch (provider) {
      case 'mock':
        return new MockAuthAdapter({ config });

      // Add real adapters here
      // case 'auth0':
      //   return new Auth0Adapter({ config });

      default:
        throw new IntegrationNotFoundError('auth', provider);
    }
  }

  /**
   * Create search adapter
   */
  private static createSearchAdapter(provider: string, config: any): IBaseIntegration {
    switch (provider) {
      case 'mock':
        return new MockSearchAdapter({ config });

      // Add real adapters here
      // case 'algolia':
      //   return new AlgoliaAdapter({ config });

      default:
        throw new IntegrationNotFoundError('search', provider);
    }
  }

  /**
   * Create PMS adapter
   */
  private static createPmsAdapter(provider: string, config: any): IBaseIntegration {
    switch (provider) {
      case 'mock':
        return new MockPmsAdapter({ config });

      // case 'beds24':
      //   return new Beds24Adapter({ config });

      default:
        throw new IntegrationNotFoundError('pms', provider);
    }
  }

  /**
   * Clear all cached instances (useful for testing)
   */
  static clearCache(): void {
    this.instances.clear();
  }

  /**
   * Get all active integrations
   */
  static getActiveIntegrations(): Map<string, IBaseIntegration> {
    return new Map(this.instances);
  }
}
