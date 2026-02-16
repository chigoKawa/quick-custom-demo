import "dotenv/config";
import contentfulManagement from "contentful-management";
const { createClient } = contentfulManagement;

const SPACE_ID = process.env.NEXT_PUBLIC_CTF_SPACE_ID;
const ENVIRONMENT_ID = process.env.NEXT_PUBLIC_CTF_ENVIRONMENT || "master";
const MANAGEMENT_TOKEN = process.env.CONTENTFUL_MANAGEMENT_TOKEN;

async function main() {
  const client = createClient(
    { accessToken: MANAGEMENT_TOKEN },
    {
      type: "plain",
      defaults: { spaceId: SPACE_ID, environmentId: ENVIRONMENT_ID },
    }
  );

  const contentTypes = await client.contentType.getMany({});

  console.log(`\n📋 Content Types in space ${SPACE_ID} (${ENVIRONMENT_ID}):\n`);

  contentTypes.items.forEach((ct) => {
    console.log(`- ${ct.sys.id}: ${ct.name}`);
    console.log(`  Description: ${ct.description || 'N/A'}`);
    console.log(`  Fields: ${ct.fields.map(f => f.id).join(', ')}`);
    console.log('');
  });
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
