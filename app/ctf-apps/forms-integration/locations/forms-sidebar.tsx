"use client";

import {
  Box,
  Flex,
  Note,
  Paragraph,
  Pill,
  SkeletonBodyText,
  SkeletonContainer,
  SkeletonDisplayText,
  Stack,
  Subheading,
  Text,
} from "@contentful/f36-components";
import type { SidebarAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useCallback, useEffect, useState } from "react";
import { fetchWithTimeout } from "../utils";
import type { Form } from "@/lib/integrations/forms/forms.interface";

export default function FormsSidebar() {
  const sdk = useSDK<SidebarAppSDK>();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWithTimeout<{ forms: Form[] }>(
        "/api/integrations/forms?limit=5",
        {},
        5000
      );

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setForms(result.data.forms);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    sdk.window.startAutoResizer();
    loadForms();
  }, [sdk, loadForms]);

  const totalFields = forms.reduce((acc, f) => acc + f.fields.length, 0);

  return (
    <Box padding="spacingM">
      <Box marginBottom="spacingM">
        <Subheading marginBottom="none">Forms integration</Subheading>
        <Paragraph marginBottom="none">
          Available forms in your library.
        </Paragraph>
      </Box>

      {loading && (
        <SkeletonContainer>
          <SkeletonDisplayText numberOfLines={1} />
          <SkeletonBodyText numberOfLines={3} offsetTop={28} />
        </SkeletonContainer>
      )}

      {error && (
        <Note variant="negative" title="Error">
          {error}
        </Note>
      )}

      {!loading && !error && (
        <Stack flexDirection="column" spacing="spacingM" alignItems="stretch">
          {/* Forms list */}
          {forms.length === 0 ? (
            <Note variant="neutral">No forms available.</Note>
          ) : (
            <Stack
              flexDirection="column"
              spacing="spacingXs"
              alignItems="stretch"
            >
              {forms.map((form) => (
                <Box
                  key={form.id}
                  padding="spacingS"
                  style={{
                    border: "1px solid #e7ebee",
                    borderRadius: 4,
                    background: "#fff",
                  }}
                >
                  <Text
                    fontWeight="fontWeightDemiBold"
                    fontSize="fontSizeS"
                    as="div"
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {form.title}
                  </Text>
                  <Box marginTop="spacing2Xs">
                    <Flex gap="spacingXs" flexWrap="wrap" alignItems="center">
                      <Text fontColor="gray600" fontSize="fontSizeS">
                        {form.fields.length} fields
                      </Text>
                      {form.category && <Pill label={form.category} />}
                    </Flex>
                  </Box>
                </Box>
              ))}
            </Stack>
          )}

          {/* Stats */}
          {forms.length > 0 && (
            <Flex gap="spacingS" flexWrap="wrap">
              <Box
                padding="spacingS"
                style={{
                  flex: "1 1 100px",
                  border: "1px solid #e7ebee",
                  borderRadius: 4,
                  background: "#fafbfc",
                  textAlign: "center",
                }}
              >
                <Text
                  fontWeight="fontWeightDemiBold"
                  fontSize="fontSizeL"
                  as="div"
                >
                  {forms.length}
                </Text>
                <Text fontColor="gray600" fontSize="fontSizeS">
                  Forms
                </Text>
              </Box>
              <Box
                padding="spacingS"
                style={{
                  flex: "1 1 100px",
                  border: "1px solid #e7ebee",
                  borderRadius: 4,
                  background: "#fafbfc",
                  textAlign: "center",
                }}
              >
                <Text
                  fontWeight="fontWeightDemiBold"
                  fontSize="fontSizeL"
                  as="div"
                >
                  {totalFields}
                </Text>
                <Text fontColor="gray600" fontSize="fontSizeS">
                  Total fields
                </Text>
              </Box>
            </Flex>
          )}
        </Stack>
      )}
    </Box>
  );
}
