/**
 * App installation parameters stored in Contentful
 */
export type PmsAppInstallationParameters = {
  provider: "mock" | "beds24";

  // Provider-specific credentials
  credentials?: {
    apiKey?: string;
    apiToken?: string;
  };

  // Configuration
  useMock?: boolean;
  simulateLatency?: boolean;
  latencyRange?: [number, number];
};

/**
 * Property selector field value (stored in Contentful entry field)
 * Single-property selection only
 */
export type PropertySelectorFieldValue = {
  version: 1;

  selectedProperty?: {
    id: string;
    name: string;
    city: string;
    heroImageUrl: string;
  };
};
