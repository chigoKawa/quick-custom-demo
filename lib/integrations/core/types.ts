/**
 * Core types and interfaces for the integration framework
 */

export type IntegrationType =
  | 'commerce'
  | 'forms'
  | 'auth'
  | 'search'
  | 'dam'
  | 'analytics'
  | 'pms';

export type IntegrationProvider = string;

export interface IntegrationConfig {
  name: string;
  provider: string;
  enabled: boolean;
  useMock?: boolean;
  endpoints?: Record<string, string>;
  credentials?: Record<string, string>;
  rateLimit?: {
    requestsPerSecond: number;
    burstLimit: number;
  };
  mockDataFixtures?: Record<string, any>;
  [key: string]: any;
}

export interface BaseIntegrationOptions {
  config: IntegrationConfig;
}

/**
 * Base integration interface that all integrations must implement
 */
export interface IBaseIntegration {
  initialize(): Promise<void>;
  healthCheck(): Promise<boolean>;
  getConfig(): IntegrationConfig;
}

/**
 * Error types for integrations
 */
export class IntegrationError extends Error {
  constructor(
    message: string,
    public code: string,
    public provider: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'IntegrationError';
  }
}

export class IntegrationNotFoundError extends IntegrationError {
  constructor(type: string, provider: string) {
    super(
      `Integration not found: ${type}/${provider}`,
      'INTEGRATION_NOT_FOUND',
      provider
    );
  }
}

export class IntegrationConfigError extends IntegrationError {
  constructor(message: string, provider: string) {
    super(message, 'INTEGRATION_CONFIG_ERROR', provider);
  }
}
