import "dotenv/config";
import contentfulManagement from "contentful-management";
const { createClient } = contentfulManagement;

const SPACE_ID = process.env.NEXT_PUBLIC_CTF_SPACE_ID;
const ENVIRONMENT_ID =
  process.env.NEXT_PUBLIC_CTF_ENVIRONMENT ||
  process.env.CONTENTFUL_ENVIRONMENT ||
  "master";
// CTF_MANAGEMENT_TOKEN first: CONTENTFUL_MANAGEMENT_TOKEN is also present in
// some .env files but is the stale name there and 401s.
const MANAGEMENT_TOKEN =
  process.env.CTF_MANAGEMENT_TOKEN || process.env.CONTENTFUL_MANAGEMENT_TOKEN;

function requireEnv(name, value) {
  if (!value || typeof value !== "string") {
    throw new Error(`Missing required env var: ${name}`);
  }
}

function buildClient() {
  requireEnv("CTF_MANAGEMENT_TOKEN", MANAGEMENT_TOKEN);
  requireEnv("NEXT_PUBLIC_CTF_SPACE_ID", SPACE_ID);

  return createClient(
    { accessToken: MANAGEMENT_TOKEN },
    {
      type: "plain",
      defaults: { spaceId: SPACE_ID, environmentId: ENVIRONMENT_ID },
    }
  );
}

async function upsertAndPublishContentType(client, definition) {
  const id = definition?.sys?.id;
  if (!id) throw new Error("Content type definition is missing sys.id");

  let current;
  try {
    current = await client.contentType.get({ contentTypeId: id });
  } catch {
    current = null;
  }

  if (!current) {
    const created = await client.contentType.createWithId(
      { contentTypeId: id },
      {
        name: definition.name,
        description: definition.description,
        displayField: definition.displayField,
        fields: definition.fields,
      }
    );

    const published = await client.contentType.publish(
      { contentTypeId: created.sys.id },
      { sys: { version: created.sys.version } }
    );

    console.log(`[Contentful] Created & published content type: ${id}`);
    return published;
  }

  const updated = await client.contentType.update(
    { contentTypeId: id },
    {
      ...current,
      name: definition.name,
      description: definition.description,
      displayField: definition.displayField,
      fields: definition.fields,
    }
  );

  const shouldPublish =
    !updated.sys.publishedVersion ||
    updated.sys.version > updated.sys.publishedVersion;

  if (shouldPublish) {
    await client.contentType.publish(
      { contentTypeId: id },
      { sys: { version: updated.sys.version } }
    );
    console.log(`[Contentful] Updated & published content type: ${id}`);
  } else {
    console.log(`[Contentful] Updated content type (already published): ${id}`);
  }

  return updated;
}

const CONTENT_TYPES = [
  {
    sys: { id: "navLink" },
    name: "Navigation Link",
    description: "Reusable navigation link (label + href + options).",
    displayField: "internalName",
    fields: [
      {
        id: "internalName",
        name: "Internal name",
        type: "Symbol",
        required: true,
        localized: false,
      },
      {
        id: "label",
        name: "Label",
        type: "Symbol",
        required: true,
        localized: true,
      },
      {
        id: "target",
        name: "Target (Internal Page)",
        type: "Link",
        required: false,
        localized: false,
        linkType: "Entry",
        validations: [
          {
            linkContentType: [
              "landingPage",
              "blogPost",
              "categoryPage",
            ],
          },
        ],
      },
      {
        id: "href",
        name: "Href (External URL or fallback)",
        type: "Symbol",
        required: false,
        localized: true,
      },
      {
        id: "openInNewTab",
        name: "Open in new tab",
        type: "Boolean",
        required: false,
        localized: false,
      },
      {
        id: "rel",
        name: "Rel",
        type: "Symbol",
        required: false,
        localized: false,
      },
      {
        id: "icon",
        name: "Icon",
        type: "Symbol",
        required: false,
        localized: false,
        validations: [
          {
            in: [
              "facebook",
              "instagram",
              "twitter",
              "youtube",
              "home",
              "search",
              "user",
              "heart",
              "shopping_bag",
            ],
          },
        ],
      },
    ],
  },
  {
    sys: { id: "navLinkColumn" },
    name: "Navigation Link Column",
    description: "A titled column of navigation links (useful for footer).",
    displayField: "internalName",
    fields: [
      {
        id: "internalName",
        name: "Internal name",
        type: "Symbol",
        required: true,
        localized: false,
      },
      {
        id: "title",
        name: "Title",
        type: "Symbol",
        required: true,
        localized: true,
      },
      {
        id: "links",
        name: "Links",
        type: "Array",
        required: false,
        localized: true,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["navLink"] }],
        },
      },
    ],
  },
  {
    sys: { id: "headerNavigation" },
    name: "Header Navigation",
    description: "Configurable header navigation menu (e.g., header categories).",
    displayField: "internalName",
    fields: [
      {
        id: "internalName",
        name: "Internal name",
        type: "Symbol",
        required: true,
        localized: false,
      },
      {
        id: "menuIdentifier",
        name: "Menu identifier",
        type: "Symbol",
        required: true,
        localized: false,
        validations: [
          {
            in: ["header-main", "header-mobile", "footer-legal", "custom"],
          },
        ],
      },
      {
        id: "menuItems",
        name: "Menu items",
        type: "Array",
        required: false,
        localized: true,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["navLink", "navigationItem"] }],
        },
      },
    ],
  },
  {
    sys: { id: "footerFeature" },
    name: "Footer Feature",
    description: "A small footer feature (icon + title + description).",
    displayField: "internalName",
    fields: [
      {
        id: "internalName",
        name: "Internal name",
        type: "Symbol",
        required: true,
        localized: false,
      },
      {
        id: "title",
        name: "Title",
        type: "Symbol",
        required: true,
        localized: true,
      },
      {
        id: "description",
        name: "Description",
        type: "Symbol",
        required: false,
        localized: true,
      },
      {
        id: "icon",
        name: "Icon",
        type: "Symbol",
        required: false,
        localized: false,
        validations: [
          {
            in: ["truck", "shield_check", "headphones", "credit_card"],
          },
        ],
      },
    ],
  },
  {
    sys: { id: "paymentMethod" },
    name: "Payment Method",
    description: "A supported payment method (label + icon).",
    displayField: "internalName",
    fields: [
      {
        id: "internalName",
        name: "Internal name",
        type: "Symbol",
        required: true,
        localized: false,
      },
      {
        id: "label",
        name: "Label",
        type: "Symbol",
        required: true,
        localized: true,
      },
      {
        id: "icon",
        name: "Icon",
        type: "Link",
        required: false,
        localized: false,
        linkType: "Asset",
      },
    ],
  },
  {
    sys: { id: "alert" },
    name: "💎 Alert",
    description: "Alert banner with rich text content, personalization, and merge tag support.",
    displayField: "internalName",
    fields: [
      {
        id: "internalName",
        name: "Internal name",
        type: "Symbol",
        required: true,
        localized: false,
      },
      {
        id: "title",
        name: "Title",
        type: "Symbol",
        required: false,
        localized: true,
      },
      {
        id: "content",
        name: "Content",
        type: "RichText",
        required: true,
        localized: true,
        validations: [
          {
            enabledNodeTypes: [
              "heading-1",
              "heading-2",
              "heading-3",
              "heading-4",
              "heading-5",
              "heading-6",
              "ordered-list",
              "unordered-list",
              "hr",
              "blockquote",
              "embedded-entry-block",
              "embedded-asset-block",
              "hyperlink",
              "entry-hyperlink",
              "asset-hyperlink",
              "embedded-entry-inline",
            ],
          },
        ],
      },
      {
        id: "actionButton",
        name: "Action button",
        type: "Link",
        required: false,
        localized: true,
        linkType: "Entry",
        validations: [
          {
            linkContentType: ["baseButton"],
          },
        ],
      },
      {
        id: "variant",
        name: "Variant",
        type: "Symbol",
        required: false,
        localized: false,
        validations: [
          {
            in: ["info", "warning", "success", "error", "default"],
          },
        ],
        defaultValue: {
          "en-US": "info",
        },
      },
      {
        id: "dismissible",
        name: "Dismissible",
        type: "Boolean",
        required: false,
        localized: false,
        defaultValue: {
          "en-US": false,
        },
      },
      {
        id: "showIcon",
        name: "Show icon",
        type: "Boolean",
        required: false,
        localized: false,
        defaultValue: {
          "en-US": true,
        },
      },
      {
        id: "nt_experiences",
        name: "Experiences",
        type: "Array",
        required: false,
        localized: false,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [
            {
              linkContentType: ["nt_experience"],
            },
          ],
        },
      },
    ],
  },
  {
    sys: { id: "siteSettings" },
    name: "Site Settings",
    description:
      "Singleton for global site chrome: header/footer navigation, branding, and basic theme tokens.",
    displayField: "internalName",
    fields: [
      {
        id: "internalName",
        name: "Internal name",
        type: "Symbol",
        required: true,
        localized: false,
      },
      {
        id: "logo",
        name: "Logo",
        type: "Link",
        required: false,
        localized: false,
        linkType: "Asset",
      },
      {
        id: "logoAlt",
        name: "Logo alt",
        type: "Symbol",
        required: false,
        localized: true,
      },
      {
        id: "logoLink",
        name: "Logo link",
        type: "Symbol",
        required: false,
        localized: true,
      },

      {
        id: "headerTopLinks",
        name: "Header top links",
        type: "Array",
        required: false,
        localized: true,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["navLink"] }],
        },
      },
      {
        id: "headerAccountLinks",
        name: "Header account links",
        type: "Array",
        required: false,
        localized: true,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["navLink"] }],
        },
      },
      {
        id: "headerPromoLink",
        name: "Header promo link",
        type: "Link",
        required: false,
        localized: true,
        linkType: "Entry",
        validations: [{ linkContentType: ["navLink"] }],
      },
      {
        id: "headerMainNavigation",
        name: "Header main navigation",
        type: "Link",
        required: false,
        localized: true,
        linkType: "Entry",
        validations: [{ linkContentType: ["headerNavigation"] }],
      },

      {
        id: "footerLinkColumns",
        name: "Footer link columns",
        type: "Array",
        required: false,
        localized: true,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["navLinkColumn"] }],
        },
      },
      {
        id: "footerSocialLinks",
        name: "Footer social links",
        type: "Array",
        required: false,
        localized: true,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["navLink"] }],
        },
      },
      {
        id: "footerFeatures",
        name: "Footer features",
        type: "Array",
        required: false,
        localized: true,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["footerFeature"] }],
        },
      },
      {
        id: "footerPaymentMethods",
        name: "Footer payment methods",
        type: "Array",
        required: false,
        localized: true,
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["paymentMethod"] }],
        },
      },
      {
        id: "footerLegalText",
        name: "Footer legal text",
        type: "Text",
        required: false,
        localized: true,
      },

      {
        id: "themePrimary",
        name: "Theme primary (hex)",
        type: "Symbol",
        required: false,
        localized: true,
      },
      {
        id: "themeBackground",
        name: "Theme background (hex)",
        type: "Symbol",
        required: false,
        localized: true,
      },
      {
        id: "themeForeground",
        name: "Theme foreground (hex)",
        type: "Symbol",
        required: false,
        localized: true,
      },
      {
        id: "themeSecondary",
        name: "Theme secondary (hex)",
        type: "Symbol",
        required: false,
        localized: true,
      },
      {
        id: "themeAccent",
        name: "Theme accent (hex)",
        type: "Symbol",
        required: false,
        localized: true,
      },
    ],
  },
];

async function main() {
  const client = buildClient();

  console.log("[Contentful] Bootstrapping content model...", {
    spaceId: SPACE_ID,
    environmentId: ENVIRONMENT_ID,
  });

  for (const ct of CONTENT_TYPES) {
    // eslint-disable-next-line no-await-in-loop
    await upsertAndPublishContentType(client, ct);
  }

  console.log("[Contentful] Done.");
}

main().catch((err) => {
  console.error("[Contentful] Bootstrap failed:", err);
  process.exit(1);
});
