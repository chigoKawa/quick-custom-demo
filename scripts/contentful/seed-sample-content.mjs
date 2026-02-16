import "dotenv/config";
import contentfulManagement from "contentful-management";
const { createClient } = contentfulManagement;

const SPACE_ID = process.env.NEXT_PUBLIC_CTF_SPACE_ID;
const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

function buildClient() {
  return createClient(
    { accessToken: MANAGEMENT_TOKEN },
    {
      type: "plain",
      defaults: { spaceId: SPACE_ID, environmentId: ENVIRONMENT_ID },
    }
  );
}

async function createAndPublishEntry(client, contentType, fields, entryLabel) {
  try {
    // Create entry
    const entry = await client.entry.create(
      { contentTypeId: contentType },
      { fields }
    );

    console.log(`  ✓ Created entry: ${entryLabel} (${entry.sys.id})`);

    // Publish entry
    await client.entry.publish(
      { entryId: entry.sys.id },
      { sys: { version: entry.sys.version } }
    );

    console.log(`  ✓ Published entry: ${entryLabel}`);
    return entry;
  } catch (error) {
    console.error(`  ✗ Error creating entry ${entryLabel}:`, error.message);
    throw error;
  }
}

async function main() {
  const client = buildClient();

  console.log("\n🌱 Seeding sample content...\n");
  console.log(`Space: ${SPACE_ID}`);
  console.log(`Environment: ${ENVIRONMENT_ID}\n`);

  // Create Navigation Links
  console.log("📝 Creating navigation links...");

  const supportLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "Support Link" },
      label: { "en-US": "Support" },
      href: { "en-US": "/support" },
      openInNewTab: { "en-US": false },
    },
    "nav-link-support"
  );

  const aboutLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "About Us Link" },
      label: { "en-US": "About Us" },
      href: { "en-US": "/about" },
      openInNewTab: { "en-US": false },
    },
    "nav-link-about"
  );

  const contactLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "Contact Link" },
      label: { "en-US": "Contact" },
      href: { "en-US": "/contact" },
      openInNewTab: { "en-US": false },
    },
    "nav-link-contact"
  );

  const signInLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "Sign In Link" },
      label: { "en-US": "Sign In" },
      href: { "en-US": "/auth/signin" },
      openInNewTab: { "en-US": false },
    },
    "nav-link-signin"
  );

  const registerLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "Register Link" },
      label: { "en-US": "Register" },
      href: { "en-US": "/auth/register" },
      openInNewTab: { "en-US": false },
    },
    "nav-link-register"
  );

  const ordersLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "My Orders Link" },
      label: { "en-US": "My Orders" },
      href: { "en-US": "/account/orders" },
      openInNewTab: { "en-US": false },
    },
    "nav-link-orders"
  );

  const promoLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "Promotions Link" },
      label: { "en-US": "Special Offers" },
      href: { "en-US": "/promotions" },
      openInNewTab: { "en-US": false },
    },
    "nav-link-promotions"
  );

  // Social Links
  const facebookLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "Facebook Link" },
      label: { "en-US": "Facebook" },
      href: { "en-US": "https://facebook.com" },
      openInNewTab: { "en-US": true },
      icon: { "en-US": "facebook" },
    },
    "nav-link-facebook"
  );

  const instagramLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "Instagram Link" },
      label: { "en-US": "Instagram" },
      href: { "en-US": "https://instagram.com" },
      openInNewTab: { "en-US": true },
      icon: { "en-US": "instagram" },
    },
    "nav-link-instagram"
  );

  const twitterLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "Twitter Link" },
      label: { "en-US": "Twitter" },
      href: { "en-US": "https://twitter.com" },
      openInNewTab: { "en-US": true },
      icon: { "en-US": "twitter" },
    },
    "nav-link-twitter"
  );

  const youtubeLink = await createAndPublishEntry(
    client,
    "navLink",
    {
      internalName: { "en-US": "YouTube Link" },
      label: { "en-US": "YouTube" },
      href: { "en-US": "https://youtube.com" },
      openInNewTab: { "en-US": true },
      icon: { "en-US": "youtube" },
    },
    "nav-link-youtube"
  );

  // Create Footer Link Columns
  console.log("\n📝 Creating footer link columns...");

  const shopColumn = await createAndPublishEntry(
    client,
    "navLinkColumn",
    {
      internalName: { "en-US": "Shop Column" },
      title: { "en-US": "Shop" },
      links: {
        "en-US": [
          { sys: { type: "Link", linkType: "Entry", id: aboutLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: contactLink.sys.id } },
        ],
      },
    },
    "footer-column-shop"
  );

  const helpColumn = await createAndPublishEntry(
    client,
    "navLinkColumn",
    {
      internalName: { "en-US": "Help Column" },
      title: { "en-US": "Help" },
      links: {
        "en-US": [
          { sys: { type: "Link", linkType: "Entry", id: supportLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: contactLink.sys.id } },
        ],
      },
    },
    "footer-column-help"
  );

  // Create Footer Features
  console.log("\n📝 Creating footer features...");

  const shippingFeature = await createAndPublishEntry(
    client,
    "footerFeature",
    {
      internalName: { "en-US": "Free Shipping Feature" },
      title: { "en-US": "Free Shipping" },
      description: { "en-US": "On orders over $50" },
      icon: { "en-US": "truck" },
    },
    "footer-feature-shipping"
  );

  const secureFeature = await createAndPublishEntry(
    client,
    "footerFeature",
    {
      internalName: { "en-US": "Secure Payments Feature" },
      title: { "en-US": "Secure Payments" },
      description: { "en-US": "100% protected" },
      icon: { "en-US": "shield_check" },
    },
    "footer-feature-secure"
  );

  const supportFeature = await createAndPublishEntry(
    client,
    "footerFeature",
    {
      internalName: { "en-US": "24/7 Support Feature" },
      title: { "en-US": "24/7 Support" },
      description: { "en-US": "Always here to help" },
      icon: { "en-US": "headphones" },
    },
    "footer-feature-support"
  );

  const returnsFeature = await createAndPublishEntry(
    client,
    "footerFeature",
    {
      internalName: { "en-US": "Easy Returns Feature" },
      title: { "en-US": "Easy Returns" },
      description: { "en-US": "Within 30 days" },
      icon: { "en-US": "credit_card" },
    },
    "footer-feature-returns"
  );

  // Create Payment Methods
  console.log("\n📝 Creating payment methods...");

  const visaPayment = await createAndPublishEntry(
    client,
    "paymentMethod",
    {
      internalName: { "en-US": "Visa" },
      label: { "en-US": "Visa" },
    },
    "payment-method-visa"
  );

  const mastercardPayment = await createAndPublishEntry(
    client,
    "paymentMethod",
    {
      internalName: { "en-US": "Mastercard" },
      label: { "en-US": "Mastercard" },
    },
    "payment-method-mastercard"
  );

  const paypalPayment = await createAndPublishEntry(
    client,
    "paymentMethod",
    {
      internalName: { "en-US": "PayPal" },
      label: { "en-US": "PayPal" },
    },
    "payment-method-paypal"
  );

  const applePayPayment = await createAndPublishEntry(
    client,
    "paymentMethod",
    {
      internalName: { "en-US": "Apple Pay" },
      label: { "en-US": "Apple Pay" },
    },
    "payment-method-applepay"
  );

  // Create Site Settings
  console.log("\n📝 Creating site settings...");

  const siteSettings = await createAndPublishEntry(
    client,
    "siteSettings",
    {
      internalName: { "en-US": "Main Site Settings" },
      logoAlt: { "en-US": "Neumann Bookstore" },
      logoLink: { "en-US": "/" },
      headerTopLinks: {
        "en-US": [
          { sys: { type: "Link", linkType: "Entry", id: supportLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: aboutLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: contactLink.sys.id } },
        ],
      },
      headerAccountLinks: {
        "en-US": [
          { sys: { type: "Link", linkType: "Entry", id: signInLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: registerLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: ordersLink.sys.id } },
        ],
      },
      headerPromoLink: {
        "en-US": { sys: { type: "Link", linkType: "Entry", id: promoLink.sys.id } },
      },
      footerLinkColumns: {
        "en-US": [
          { sys: { type: "Link", linkType: "Entry", id: shopColumn.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: helpColumn.sys.id } },
        ],
      },
      footerSocialLinks: {
        "en-US": [
          { sys: { type: "Link", linkType: "Entry", id: facebookLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: instagramLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: twitterLink.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: youtubeLink.sys.id } },
        ],
      },
      footerFeatures: {
        "en-US": [
          { sys: { type: "Link", linkType: "Entry", id: shippingFeature.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: secureFeature.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: supportFeature.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: returnsFeature.sys.id } },
        ],
      },
      footerPaymentMethods: {
        "en-US": [
          { sys: { type: "Link", linkType: "Entry", id: visaPayment.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: mastercardPayment.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: paypalPayment.sys.id } },
          { sys: { type: "Link", linkType: "Entry", id: applePayPayment.sys.id } },
        ],
      },
      footerLegalText: {
        "en-US": "© 2026 Neumann Bookstore. All rights reserved.",
      },
      themePrimary: { "en-US": "#e73331" },
      themeBackground: { "en-US": "#ffffff" },
      themeForeground: { "en-US": "#1a1a1a" },
    },
    "site-settings-main"
  );

  console.log("\n✅ Sample content created successfully!");
  console.log("\n📍 Next steps:");
  console.log("   1. Visit your Contentful space: https://app.contentful.com/spaces/" + SPACE_ID);
  console.log("   2. Upload a logo to the siteSettings entry");
  console.log("   3. Add payment method icons to the paymentMethod entries");
  console.log("   4. Run your dev server to see the changes: npm run dev");
}

main().catch((err) => {
  console.error("\n❌ Seeding failed:", err);
  process.exit(1);
});
