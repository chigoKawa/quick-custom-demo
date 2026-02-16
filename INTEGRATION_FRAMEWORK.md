# Integration Framework Documentation

## Overview

This integration framework provides a vendor-agnostic, mock-able system for integrating with various third-party services. It's designed specifically for Solutions Engineering demos where you need to quickly adapt to different customer requirements and demonstrate integrations without actual API credentials.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│ Configuration Files (JSON)                          │
│ - config/integrations/*.json                        │
│ - Easy to customize per customer                    │
└────────────┬────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────┐
│ Integration Factory                                  │
│ - Reads config, selects provider                    │
│ - Returns appropriate adapter                        │
└────────────┬────────────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────────────┐
│ Provider Adapters                                    │
│ ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│ │ Shopify  │  │ HubSpot  │  │  Mock    │           │
│ │ Adapter  │  │ Adapter  │  │ Adapters │           │
│ └──────────┘  └──────────┘  └──────────┘           │
└─────────────────────────────────────────────────────┘
```

## Integration Types

### 1. Commerce (`lib/integrations/commerce/`)
**Purpose:** Product catalog, cart management, checkout

**Providers:**
- `mock` - Fully functional mock with realistic behavior
- `shopify` - (Coming soon) Real Shopify integration
- `bigcommerce` - (Coming soon)

**Key Methods:**
- `getProducts(filters)` - Get product catalog
- `getProduct(id)` - Get single product
- `addToCart(item)` - Add item to cart
- `checkout(cartId, customerData)` - Complete purchase

**Example Usage:**
```typescript
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';

// Get commerce integration (auto-selects provider from config)
const commerce = await IntegrationFactory.getIntegration('commerce');

// Use it
const products = await commerce.getProducts({
  category: 'fiction',
  limit: 20,
  sort: 'popular'
});
```

### 2. Forms (`lib/integrations/forms/`)
**Purpose:** Form creation, submission, lead capture

**Providers:**
- `mock` - Mock form handling
- `hubspot` - (Coming soon)
- `salesforce` - (Coming soon)

**Key Methods:**
- `createForm(schema)` - Create a new form
- `submitForm(formId, data)` - Submit form data
- `getSubmissions(formId)` - Get form submissions

### 3. Auth (`lib/integrations/auth/`)
**Purpose:** User authentication, registration, profile management

**Providers:**
- `mock` - Mock authentication with demo user
- `auth0` - (Coming soon)
- `okta` - (Coming soon)

**Key Methods:**
- `login(credentials)` - Authenticate user
- `register(userData)` - Create new account
- `getCurrentUser(token)` - Get user profile

### 4. Search (`lib/integrations/search/`)
**Purpose:** Site search, autocomplete, content indexing

**Providers:**
- `mock` - In-memory search
- `algolia` - (Coming soon)
- `elasticsearch` - (Coming soon)

**Key Methods:**
- `search(query, filters)` - Search content
- `autocomplete(query)` - Get suggestions
- `indexContent(documents)` - Index searchable content

## Configuration

### Environment Variables

Create `.env.local` for customer-specific settings:

```bash
# Toggle all integrations to mock mode
USE_MOCK_INTEGRATIONS=true

# Or toggle individual integrations
USE_MOCK_COMMERCE=true
USE_MOCK_FORMS=false

# Select specific providers
COMMERCE_PROVIDER=shopify
FORMS_PROVIDER=hubspot

# Provider-specific credentials (only needed for real integrations)
SHOPIFY_SHOP_NAME=demo-store
SHOPIFY_ACCESS_TOKEN=xxx
HUBSPOT_API_KEY=xxx
```

### Configuration Files

#### `config/integrations/commerce.json`

```json
{
  "defaultProvider": "mock",
  "providers": {
    "mock": {
      "name": "Mock Commerce",
      "enabled": true,
      "useMock": true,
      "fixtureFile": "products.json"
    },
    "shopify": {
      "name": "Shopify",
      "enabled": false,
      "baseUrl": "https://{shop}.myshopify.com",
      "credentials": {
        "shopName": "${SHOPIFY_SHOP_NAME}",
        "accessToken": "${SHOPIFY_ACCESS_TOKEN}"
      }
    }
  }
}
```

## Mock Data

Mock data lives in `lib/mock-data/`:

- `products.json` - Product catalog (5 sample books)
- `users.json` - (Coming soon) User accounts
- `orders.json` - (Coming soon) Order history

**Customize Mock Data:**

```bash
# Add more products
code lib/mock-data/products.json

# Products automatically loaded by MockCommerceAdapter
```

## Usage in API Routes

### Example: Product API Route

```typescript
// app/api/products/route.ts
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';
import type { ICommerceIntegration } from '@/lib/integrations/commerce';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  // Get commerce integration
  const commerce = await IntegrationFactory.getIntegration('commerce') as ICommerceIntegration;

  // Fetch products
  const products = await commerce.getProducts({
    category: category || undefined,
    limit: 20,
    sort: 'popular'
  });

  return Response.json({ products });
}
```

### Example: Form Submission

```typescript
// app/api/forms/[formId]/submit/route.ts
import { IntegrationFactory } from '@/lib/integrations/core/integration-factory';
import type { IFormsIntegration } from '@/lib/integrations/forms';

export async function POST(
  request: Request,
  { params }: { params: { formId: string } }
) {
  const data = await request.json();

  const forms = await IntegrationFactory.getIntegration('forms') as IFormsIntegration;

  const submission = await forms.submitForm(params.formId, data);

  return Response.json({ success: true, submission });
}
```

## Customer Onboarding Workflow

### 1. Create New Customer Space

```bash
# Create Contentful space
./scripts/setup-customer.sh "Customer ABC" retail

# This creates:
# - New Contentful space with content types
# - .env.customer-abc file
# - Sample site settings content
```

### 2. Customize Integration Config

```bash
# Option A: Use all mocks (default)
USE_MOCK_INTEGRATIONS=true

# Option B: Mix real + mock
USE_MOCK_COMMERCE=false
USE_MOCK_FORMS=true
COMMERCE_PROVIDER=shopify
SHOPIFY_SHOP_NAME=customer-abc
SHOPIFY_ACCESS_TOKEN=xxx
```

### 3. Deploy

```bash
# Deploy to customer-specific URL
vercel --env-file .env.customer-abc
```

## Adding New Providers

### Example: Add Shopify Adapter

1. **Create the adapter:**

```typescript
// lib/integrations/commerce/shopify.adapter.ts
import { BaseIntegration } from '../core/base-integration';
import type { ICommerceIntegration, Product } from './commerce.interface';

export class ShopifyAdapter extends BaseIntegration implements ICommerceIntegration {
  private shopifyClient: any;

  async initialize(): Promise<void> {
    await super.initialize();

    const shopify = require('shopify-api-node');
    this.shopifyClient = new shopify({
      shopName: this.config.credentials.shopName,
      accessToken: this.config.credentials.accessToken,
    });

    this.log('info', 'Shopify client initialized');
  }

  async getProducts(filters?: ProductFilters): Promise<Product[]> {
    const products = await this.shopifyClient.product.list({
      limit: filters?.limit || 20,
    });

    // Transform Shopify products to our interface
    return products.map(this.transformProduct);
  }

  // Implement other methods...
}
```

2. **Register in factory:**

```typescript
// lib/integrations/core/integration-factory.ts
import { ShopifyAdapter } from '../commerce/shopify.adapter';

private static createCommerceAdapter(provider: string, config: any) {
  switch (provider) {
    case 'mock':
      return new MockCommerceAdapter({ config });
    case 'shopify':
      return new ShopifyAdapter({ config }); // Add this
    default:
      throw new IntegrationNotFoundError('commerce', provider);
  }
}
```

3. **Add configuration:**

```json
// config/integrations/commerce.json
{
  "providers": {
    "shopify": {
      "name": "Shopify",
      "enabled": true,
      "baseUrl": "https://{shop}.myshopify.com",
      "credentials": {
        "shopName": "${SHOPIFY_SHOP_NAME}",
        "accessToken": "${SHOPIFY_ACCESS_TOKEN}"
      }
    }
  }
}
```

## Benefits for Solutions Engineering

### ✅ Fast Demo Prep
- Switch between mock and real data instantly
- No API credentials needed for initial demos
- Realistic behavior with simulated latency

### ✅ Customer Adaptability
- Configure integrations per customer in JSON
- Mix and match providers
- Show different integration scenarios

### ✅ Type Safety
- TypeScript interfaces ensure consistency
- Catch errors at compile time
- Great IDE autocomplete

### ✅ Maintainable
- Single source of truth for integration logic
- Easy to add new providers
- Clear separation of concerns

## Next Steps

1. **Add More Mock Data**
   - Create `users.json`, `orders.json`, `reviews.json`
   - Expand product catalog

2. **Implement Real Adapters**
   - Shopify for commerce
   - HubSpot for forms
   - Auth0 for authentication

3. **Create Demo Presets**
   - `config/demo-presets/retail.json`
   - `config/demo-presets/university.json`
   - Quick-load configurations for common scenarios

4. **Build Demo Panel Controls**
   - UI to switch providers on-the-fly
   - View integration health status
   - Mock data generator

## Troubleshooting

### Integration not loading
```bash
# Check config file exists
ls config/integrations/commerce.json

# Check environment variables
echo $USE_MOCK_INTEGRATIONS
echo $COMMERCE_PROVIDER
```

### Mock data not found
```bash
# Verify mock data file
cat lib/mock-data/products.json

# Check file path in config
cat config/integrations/commerce.json | grep fixtureFile
```

### Type errors
```bash
# Ensure all interfaces are implemented
npm run type-check
```

---

**Created:** 2026-02-02
**Version:** 1.0.0
**Author:** Contentful Solutions Engineering
