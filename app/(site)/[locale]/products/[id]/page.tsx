import { notFound } from "next/navigation";
import Link from "next/link";
import { getI18nConfig } from "@/i18n-config";
import { IntegrationFactory } from "@/lib/integrations/core/integration-factory";
import type { ICommerceIntegration } from "@/lib/integrations/commerce/commerce.interface";

export default async function ProductDetailPage(
  props: {
    params: Promise<{ locale: string; id: string }>;
  }
) {
  const { locale, id } = await props.params;
  const { locales, defaultLocale } = await getI18nConfig();
  const effectiveLocale = locales.includes(locale as string) ? locale : defaultLocale;

  // Get product from commerce integration
  let product;
  try {
    const commerce = await IntegrationFactory.getIntegration('commerce') as ICommerceIntegration;
    product = await commerce.getProduct(id);
  } catch (error) {
    console.error('Error fetching product:', error);
    notFound();
  }

  if (!product) {
    notFound();
  }

  const imageUrl = product.images && product.images.length > 0 ? product.images[0] : null;

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="mb-6">
        <Link 
          href={`/${effectiveLocale}`}
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          ← Back to Home
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-12">
        {/* Product Image */}
        <div>
          <div className="aspect-square rounded-2xl overflow-hidden bg-muted shadow-lg">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-8xl bg-gradient-to-br from-primary/20 to-primary/5">
                🛍️
              </div>
            )}
          </div>
        </div>

        {/* Product Info */}
        <div>
          {product.category && (
            <span className="inline-block text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground mb-4">
              {product.category}
            </span>
          )}
          
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold mb-4">
            {product.title}
          </h1>

          {product.description && (
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              {product.description}
            </p>
          )}

          <div className="flex items-baseline gap-4 mb-8">
            <span className="text-4xl font-bold text-primary">
              £{product.price.toFixed(2)}
            </span>
            {product.stock > 0 ? (
              <span className="text-sm text-green-600 font-medium">
                In Stock ({product.stock} available)
              </span>
            ) : (
              <span className="text-sm text-red-600 font-medium">
                Out of Stock
              </span>
            )}
          </div>

          {/* Add to Cart Button */}
          <button 
            className="w-full md:w-auto px-8 py-4 bg-primary text-primary-foreground rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors shadow-lg"
            disabled={product.stock === 0}
          >
            Add to Cart
          </button>

          {/* Product Details */}
          <div className="mt-10 pt-8 border-t">
            <h2 className="text-lg font-semibold mb-4">Product Details</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              {product.sku && (
                <>
                  <dt className="text-muted-foreground">SKU</dt>
                  <dd className="font-medium">{product.sku}</dd>
                </>
              )}
              {product.category && (
                <>
                  <dt className="text-muted-foreground">Category</dt>
                  <dd className="font-medium capitalize">{product.category}</dd>
                </>
              )}
              {product.rating && (
                <>
                  <dt className="text-muted-foreground">Rating</dt>
                  <dd className="font-medium">
                    ⭐ {product.rating.toFixed(1)} ({product.reviewCount || 0} reviews)
                  </dd>
                </>
              )}
              {product.tags && product.tags.length > 0 && (
                <>
                  <dt className="text-muted-foreground">Tags</dt>
                  <dd className="font-medium">
                    {product.tags.map((tag, i) => (
                      <span 
                        key={tag} 
                        className="inline-block mr-2 mb-1 px-2 py-0.5 bg-muted rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </dd>
                </>
              )}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
