export const APP_NAME = "Page Tree";
export const DEFAULT_CONTENT_TYPE_ID = "landingPage";
export const DEFAULT_PARENT_FIELD    = "parent";
export const DEFAULT_FULLPATH_FIELD  = "fullPath";
export const DEFAULT_SLUG_FIELD      = "slug";
export const DEFAULT_LOCALE          = "en-US";

const PALETTE: { bg: string; text: string }[] = [
  { bg: "#e3f2fd", text: "#1565c0" },
  { bg: "#fce4ec", text: "#880e4f" },
  { bg: "#f3e5f5", text: "#6a1b9a" },
  { bg: "#fef3c7", text: "#92400e" },
  { bg: "#ede9fe", text: "#5b21b6" },
  { bg: "#ecfdf5", text: "#065f46" },
  { bg: "#fff7ed", text: "#c2410c" },
  { bg: "#f0f9ff", text: "#0c4a6e" },
  { bg: "#fef2f2", text: "#991b1b" },
  { bg: "#f5f5f4", text: "#44403c" },
  { bg: "#fdf4ff", text: "#86198f" },
  { bg: "#f0fdfa", text: "#115e59" },
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

const colourCache = new Map<string, { bg: string; text: string }>();

export function getBadgeColour(contentTypeId: string): { bg: string; text: string } {
  const cached = colourCache.get(contentTypeId);
  if (cached) return cached;
  const colour = PALETTE[hashString(contentTypeId) % PALETTE.length];
  colourCache.set(contentTypeId, colour);
  return colour;
}
