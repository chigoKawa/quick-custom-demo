import type {
  IBaseIntegration,
  IntegrationConfig,
  BaseIntegrationOptions,
} from './types';

/**
 * Abstract base class for all integrations
 * Provides common functionality and enforces interface contracts
 */
export abstract class BaseIntegration implements IBaseIntegration {
  protected config: IntegrationConfig;
  protected initialized: boolean = false;

  constructor(options: BaseIntegrationOptions) {
    this.config = options.config;
  }

  /**
   * Initialize the integration
   * Override this method to perform any setup (e.g., API authentication)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    this.initialized = true;
  }

  /**
   * Check if the integration is healthy
   * Override this method to perform actual health checks
   */
  async healthCheck(): Promise<boolean> {
    return this.initialized;
  }

  /**
   * Get the integration configuration
   */
  getConfig(): IntegrationConfig {
    return { ...this.config };
  }

  /**
   * Check if mock mode is enabled
   */
  protected isMockMode(): boolean {
    return Boolean(this.config.useMock || process.env.USE_MOCK_INTEGRATIONS === 'true');
  }

  /**
   * Simulate network latency for mock responses
   */
  protected async simulateLatency(): Promise<void> {
    if (!this.isMockMode()) {
      return;
    }

    const min = 100;
    const max = 500;
    const delay = Math.floor(Math.random() * (max - min + 1)) + min;

    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Log integration activity (can be extended for monitoring)
   */
  protected log(level: 'info' | 'warn' | 'error', message: string, data?: any): void {
    const prefix = `[Integration:${this.config.provider}]`;

    switch (level) {
      case 'error':
        console.error(prefix, message, data);
        break;
      case 'warn':
        console.warn(prefix, message, data);
        break;
      default:
        console.log(prefix, message, data);
    }
  }
}
