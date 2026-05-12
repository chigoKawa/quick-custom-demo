import { notFound } from "next/navigation";
import Link from "next/link";
import { getI18nConfig } from "@/i18n-config";
import { IntegrationFactory } from "@/lib/integrations/core/integration-factory";
import type { ICommerceIntegration } from "@/lib/integrations/commerce/commerce.interface";
import { AddToCartButton } from "./add-to-cart-button";

function formatPrice(price: number, currency?: string): string {
  const c = (currency ?? "NOK").toUpperCase();
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency: c, minimumFractionDigits: 2 }).format(price);
  } catch {
    return `${c} ${price.toFixed(2)}`;
  }
}

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
  const showPrice = product.price > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/10">
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 pt-6">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link 
            href={`/${effectiveLocale}`}
            className="hover:text-primary transition-colors"
          >
            Home
          </Link>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
          {product.category && (
            <>
              <span className="hover:text-primary transition-colors cursor-pointer capitalize">
                {product.category}
              </span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </>
          )}
          <span className="text-foreground font-medium truncate max-w-[200px]">
            {product.title}
          </span>
        </nav>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16">
          {/* Product Image Section */}
          <div className="space-y-4">
            <div className="aspect-square rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted shadow-2xl ring-1 ring-black/5 relative group">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={product.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                  <div className="w-32 h-32 rounded-3xl bg-primary/10 flex items-center justify-center">
                    <svg className="w-16 h-16 text-primary/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                </div>
              )}
              {/* Zoom hint */}
              <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm text-xs font-medium shadow-lg">
                  Hover to zoom
                </span>
              </div>
            </div>
          </div>

          {/* Product Info Section */}
          <div className="flex flex-col">
            {/* Category Badge */}
            {product.category && (
              <span className="inline-flex items-center self-start text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary mb-4">
                {product.category}
              </span>
            )}
            
            {/* Title */}
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight">
              {product.title}
            </h1>

            {/* Rating */}
            {product.rating && (
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(product.rating ?? 0) ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30'}`}
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">
                  {product.rating.toFixed(1)} ({product.reviewCount || 0} reviews)
                </span>
              </div>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-base md:text-lg text-muted-foreground mb-6 leading-relaxed max-w-xl">
                {product.description}
              </p>
            )}

            {/* Price & Stock Card */}
            <div className="p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50 shadow-sm mb-6">
              <div className="flex items-center justify-between gap-4 mb-4">
                {showPrice && (
                  <span className="text-3xl md:text-4xl font-bold text-primary">
                    {formatPrice(product.price, product.currency)}
                  </span>
                )}
                {product.stock > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    In Stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-1.5 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    Out of Stock
                  </span>
                )}
              </div>
              
              {product.sku && (
                <p className="text-sm text-muted-foreground font-mono">
                  SKU: {product.sku}
                </p>
              )}
            </div>

            {/* Add to Cart Button */}
            <div className="mb-8">
              <AddToCartButton
                productId={product.id}
                productTitle={product.title}
                productPrice={product.price}
                productSku={product.sku}
                disabled={product.stock === 0}
              />
            </div>

            {/* Features/Trust Badges */}
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-border/50">
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Free Shipping</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Secure Payment</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                </div>
                <span className="text-xs font-medium">Easy Returns</span>
              </div>
            </div>

            {/* Tags */}
            {product.tags && product.tags.length > 0 && (
              <div className="pt-6 border-t border-border/50">
                <h3 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {product.tags.map((tag) => (
                    <span 
                      key={tag} 
                      className="px-3 py-1.5 bg-muted/80 hover:bg-muted rounded-full text-xs font-medium transition-colors cursor-pointer"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
