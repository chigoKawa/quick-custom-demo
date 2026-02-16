import type { Asset } from "contentful";

/**
 * Focal point data structure from Contentful imageWithFocalPoint content type
 */
export interface FocalPoint {
  x: number; // 0-1 percentage from left
  y: number; // 0-1 percentage from top
}

/**
 * Extract focal point from an imageWithFocalPoint entry
 */
export function extractFocalPoint(
  focalPointData: unknown,
  imageWidth?: number,
  imageHeight?: number
): FocalPoint | null {
  if (!focalPointData || typeof focalPointData !== "object") return null;

  const data = focalPointData as Record<string, unknown>;
  
  // Handle nested structure from Contentful Image Focal Point App: { focalPoint: { x, y } }
  const fp = (data.focalPoint && typeof data.focalPoint === "object" 
    ? data.focalPoint 
    : data) as Record<string, unknown>;
  
  const rawX = typeof fp.x === "number" ? fp.x : null;
  const rawY = typeof fp.y === "number" ? fp.y : null;

  if (rawX === null || rawY === null) return null;

  // Determine if values are in pixels (> 1) or already 0-1 percentages
  // If image dimensions are provided and values > 1, convert from pixels to percentages
  let x = rawX;
  let y = rawY;
  
  if (rawX > 1 || rawY > 1) {
    // Values are in pixels, convert to 0-1 percentages
    // Use image dimensions if available, otherwise assume 1000px as default
    const width = imageWidth || 1000;
    const height = imageHeight || 1000;
    x = rawX / width;
    y = rawY / height;
  }

  // Ensure values are in 0-1 range
  return {
    x: Math.max(0, Math.min(1, x)),
    y: Math.max(0, Math.min(1, y)),
  };
}

/**
 * Convert focal point to CSS object-position value
 * @param focalPoint - The focal point data (x, y as 0-1 percentages)
 * @returns CSS object-position string like "50% 30%"
 */
export function focalPointToObjectPosition(
  focalPoint: FocalPoint | null | undefined
): string {
  if (!focalPoint) return "center center";

  const xPercent = Math.round(focalPoint.x * 100);
  const yPercent = Math.round(focalPoint.y * 100);

  return `${xPercent}% ${yPercent}%`;
}

/**
 * Extract image URL and focal point from an imageWithFocalPoint entry
 */
export function extractImageWithFocalPoint(entry: unknown): {
  url: string;
  alt: string;
  focalPoint: FocalPoint | null;
  objectPosition: string;
  entryId: string;
  assetId: string;
} {
  const defaultResult = {
    url: "",
    alt: "",
    focalPoint: null,
    objectPosition: "center center",
    entryId: "",
    assetId: "",
  };

  if (!entry || typeof entry !== "object") return defaultResult;

  const e = entry as Record<string, unknown>;
  const sys = e.sys as Record<string, unknown> | undefined;
  const entryId = (sys?.id as string) || "";
  
  const fields = e.fields as Record<string, unknown> | undefined;
  if (!fields) return defaultResult;

  // Extract image asset
  const imageAsset = fields.image as Asset | undefined;
  const url = imageAsset?.fields?.file?.url?.toString() || "";
  const alt = (fields.title as string) || "";
  const assetId = (imageAsset?.sys?.id as string) || "";

  // Get image dimensions for focal point conversion
  const fileDetails = imageAsset?.fields?.file?.details as Record<string, unknown> | undefined;
  const imageDetails = fileDetails?.image as Record<string, unknown> | undefined;
  const imageWidth = typeof imageDetails?.width === "number" ? imageDetails.width : undefined;
  const imageHeight = typeof imageDetails?.height === "number" ? imageDetails.height : undefined;

  // Extract focal point with image dimensions for pixel-to-percentage conversion
  const focalPoint = extractFocalPoint(fields.focalPoint, imageWidth, imageHeight);
  const objectPosition = focalPointToObjectPosition(focalPoint);

  return {
    url: url.startsWith("//") ? `https:${url}` : url,
    alt,
    focalPoint,
    objectPosition,
    entryId,
    assetId,
  };
}

/**
 * Build Contentful Image API URL with focal point crop
 * @param baseUrl - The base Contentful asset URL
 * @param focalPoint - The focal point data
 * @param width - Desired width
 * @param height - Desired height
 * @returns URL with fit=crop and f= parameters for focal point
 */
export function buildFocalPointImageUrl(
  baseUrl: string,
  focalPoint: FocalPoint | null | undefined,
  width?: number,
  height?: number
): string {
  if (!baseUrl) return "";

  const url = new URL(baseUrl.startsWith("//") ? `https:${baseUrl}` : baseUrl);

  if (width) url.searchParams.set("w", String(width));
  if (height) url.searchParams.set("h", String(height));

  if (focalPoint && width && height) {
    // Contentful doesn't support arbitrary focal points in URL params,
    // so we rely on object-position CSS for precise positioning
    // But we can use fit=fill to ensure the image fills the container
    url.searchParams.set("fit", "fill");
  }

  return url.toString();
}
