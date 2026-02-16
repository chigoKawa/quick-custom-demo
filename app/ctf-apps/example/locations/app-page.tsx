"use client";

import { Box, Heading, Paragraph, Text } from "@contentful/f36-components";
import { APP_NAME } from "../constants";

const AppPage = () => {
  return (
    <Box padding="spacingL" style={{ maxWidth: 820 }}>
      <Heading as="h2">{APP_NAME}</Heading>
      <Paragraph>
        This is the Newsletter Preview app page location stub. The detailed
        behavior and UI will be implemented once the app plan is defined.
      </Paragraph>
      <Box marginTop="spacingM">
        <Text>
          You can safely install this app; it currently performs no CMA writes.
        </Text>
      </Box>
    </Box>
  );
};

export default AppPage;
