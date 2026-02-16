import fs from 'fs';
import path from 'path';
import type { IntegrationType, IntegrationConfig } from './types';
import { IntegrationConfigError } from './types';

const CONFIG_DIR = path.join(process.cwd(), 'config', 'integrations');

/**
 * Load integration configuration from JSON file
 * Priority: appParams > env vars > JSON file
 */
export async function loadIntegrationConfig(
  type: IntegrationType,
  provider?: string,
  appParams?: Record<string, any>
): Promise<IntegrationConfig> {
  const configPath = path.join(CONFIG_DIR, `${type}.json`);

  if (!fs.existsSync(configPath)) {
    throw new IntegrationConfigError(
      `Configuration file not found: ${configPath}`,
      provider || 'unknown'
    );
  }

  try {
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    // Determine which provider to use
    // Priority: explicit provider param > appParams > env var > default
    const activeProvider =
      provider ||
      appParams?.provider ||
      process.env[`${type.toUpperCase()}_PROVIDER`] ||
      config.defaultProvider;

    if (!config.providers || !config.providers[activeProvider]) {
      throw new IntegrationConfigError(
        `Provider "${activeProvider}" not found in ${type} configuration`,
        activeProvider
      );
    }

    // Merge: base config < JSON file < appParams
    const baseConfig = {
      ...config.providers[activeProvider],
      provider: activeProvider,
      enabled: true,
    };

    // If appParams provided, merge them in (Contentful App installation params take precedence)
    if (appParams) {
      return {
        ...baseConfig,
        ...appParams,
        provider: activeProvider, // Keep provider consistent
      };
    }

    return baseConfig;
  } catch (error) {
    if (error instanceof IntegrationConfigError) {
      throw error;
    }
    throw new IntegrationConfigError(
      `Failed to parse configuration file: ${configPath}`,
      provider || 'unknown'
    );
  }
}

/**
 * Load demo preset configuration
 */
export async function loadDemoPreset(presetName: string): Promise<any> {
  const presetPath = path.join(
    process.cwd(),
    'config',
    'demo-presets',
    `${presetName}.json`
  );

  if (!fs.existsSync(presetPath)) {
    throw new Error(`Demo preset not found: ${presetName}`);
  }

  const presetContent = fs.readFileSync(presetPath, 'utf-8');
  return JSON.parse(presetContent);
}

/**
 * Load mock data from fixtures
 */
export async function loadMockData<T = any>(dataFile: string): Promise<T> {
  const dataPath = path.join(process.cwd(), 'lib', 'mock-data', dataFile);

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Mock data file not found: ${dataFile}`);
  }

  const dataContent = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(dataContent) as T;
}
