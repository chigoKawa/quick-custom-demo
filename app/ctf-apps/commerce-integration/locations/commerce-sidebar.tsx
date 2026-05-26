"use client";

import {
  Badge,
  Box,
  Button,
  Flex,
  Note,
  Paragraph,
  SkeletonContainer,
  SkeletonDisplayText,
  SkeletonBodyText,
  Stack,
  Subheading,
  Text,
} from "@contentful/f36-components";
import type { SidebarAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { useEffect, useState, useCallback } from "react";
import { fetchWithTimeout } from "../utils";

type SidebarState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; data: CommerceStats };

type CommerceStats = {
  provider?: string;
  healthy?: boolean;
  count?: number;
  products?: Array<{
    id: string;
    title: string;
    price: number;
  }>;
};

export default function CommerceSidebar() {
  const sdk = useSDK<SidebarAppSDK>();
  const [statsState, setStatsState] = useState<SidebarState>({ status: "idle" });

  const loadStats = useCallback(async () => {
    setStatsState({ status: "loading" });

    try {
      const result = await fetchWithTimeout<CommerceStats>(
        "/api/integrations/products?limit=5",
        {},
        5000
      );

      if (!result.ok) {
        setStatsState({ status: "error", message: result.error });
        return;
      }

      setStatsState({ status: "success", data: result.data });
    } catch (error) {
      setStatsState({
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  useEffect(() => {
    sdk.window.startAutoResizer();
  }, [sdk]);

  return (
    <Box padding="spacingM">
      <Box marginBottom="spacingM">
        <Subheading marginBottom="none">Commerce</Subheading>
        <Paragraph marginBottom="none">
          Quick stats and actions for your commerce integration.
        </Paragraph>
      </Box>

      {statsState.status === "loading" && (
        <SkeletonContainer>
          <SkeletonDisplayText numberOfLines={1} />
          <SkeletonBodyText numberOfLines={3} offsetTop={28} />
        </SkeletonContainer>
      )}

      {statsState.status === "error" && (
        <Note variant="negative" title="Error">
          {statsState.message}
        </Note>
      )}

      {statsState.status === "success" && (
        <Stack flexDirection="column" spacing="spacingM" alignItems="stretch">
          {/* Status card */}
          <Box
            padding="spacingM"
            style={{
              border: "1px solid #e7ebee",
              borderRadius: 6,
              background: "#fafbfc",
            }}
          >
            <Box marginBottom="spacingS">
              <Text fontWeight="fontWeightDemiBold">Provider status</Text>
            </Box>
            <Stack
              flexDirection="column"
              spacing="spacingXs"
              alignItems="stretch"
            >
              <Flex justifyContent="space-between" alignItems="center">
                <Text fontColor="gray600">Provider</Text>
                <Text>{statsState.data.provider || "Unknown"}</Text>
              </Flex>
              <Flex justifyContent="space-between" alignItems="center">
                <Text fontColor="gray600">Health</Text>
                <Badge variant={statsState.data.healthy ? "positive" : "negative"}>
                  {statsState.data.healthy ? "Healthy" : "Unhealthy"}
                </Badge>
              </Flex>
              <Flex justifyContent="space-between" alignItems="center">
                <Text fontColor="gray600">Products</Text>
                <Text>{statsState.data.count ?? 0}</Text>
              </Flex>
            </Stack>
          </Box>

          {/* Recent products */}
          {statsState.data.products && statsState.data.products.length > 0 ? (
            <Box>
              <Box marginBottom="spacingS">
                <Text fontWeight="fontWeightDemiBold">Recent products</Text>
              </Box>
              <Stack
                flexDirection="column"
                spacing="spacing2Xs"
                alignItems="stretch"
              >
                {statsState.data.products.slice(0, 5).map((product) => (
                  <Flex
                    key={product.id}
                    justifyContent="space-between"
                    alignItems="center"
                    gap="spacingS"
                    style={{
                      padding: "8px 10px",
                      border: "1px solid #e7ebee",
                      borderRadius: 4,
                    }}
                  >
                    <Text
                      fontSize="fontSizeS"
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        minWidth: 0,
                      }}
                    >
                      {product.title}
                    </Text>
                    <Text
                      fontWeight="fontWeightDemiBold"
                      fontSize="fontSizeS"
                      style={{ flexShrink: 0 }}
                    >
                      ${product.price.toFixed(2)}
                    </Text>
                  </Flex>
                ))}
              </Stack>
            </Box>
          ) : (
            <Note variant="neutral">No products available.</Note>
          )}

          <Button variant="secondary" onClick={loadStats} isFullWidth>
            Refresh stats
          </Button>
        </Stack>
      )}

      <Box marginTop="spacingM">
        <Note variant="neutral">
          Use the Product Catalog field to add products to your content.
          Configure your commerce provider in the app settings.
        </Note>
      </Box>
    </Box>
  );
}
