"use client";

import React, { useEffect } from "react";
import type { ConfigAppSDK } from "@contentful/app-sdk";
import { useSDK } from "@contentful/react-apps-toolkit";
import { Box, Heading, Note, Paragraph, Subheading, Text } from "@contentful/f36-components";

const codeStyle: React.CSSProperties = {
  background: "#f7f9fa",
  border: "1px solid #e7ebee",
  borderRadius: 4,
  padding: "10px 14px",
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
  fontSize: 12,
  lineHeight: 1.6,
  whiteSpace: "pre",
  overflowX: "auto",
  color: "#1a2026",
  display: "block",
  marginTop: 8,
};

export default function ConfigScreen() {
  const sdk = useSDK<ConfigAppSDK>();

  useEffect(() => {
    sdk.app.setReady();
    sdk.app.onConfigure(async () => ({ parameters: {} }));
  }, [sdk]);

  return (
    <Box padding="spacingXl" style={{ maxWidth: 720, margin: "0 auto" }}>
      <Heading>Content Anchor</Heading>
      <Paragraph>
        Content Anchor is a reusable WYSIWYG positioning tool. Attach it to any
        JSON Object field on any content type — it renders a drag canvas where
        editors can freely position a content block and saves the result as a
        small coordinate payload. The frontend reads those coordinates and
        renders the content at the correct position.
      </Paragraph>
      <Paragraph>
        No configuration is required here. Simply assign this app to a JSON
        Object field in the field appearance settings of any content type.
      </Paragraph>

      <Box marginTop="spacingXl">
        <Subheading>Output JSON</Subheading>
        <Paragraph>
          The field saves a single object. <code>x</code> and <code>y</code> are
          0–1 fractions of the container width and height respectively, with the
          origin at the top-left corner.
        </Paragraph>
        <code style={codeStyle}>{`{
  "x": 0.35,   // 0 = left edge, 1 = right edge
  "y": 0.72,   // 0 = top edge,  1 = bottom edge
  "version": 1
}`}</code>
      </Box>

      <Box marginTop="spacingXl">
        <Subheading>Frontend integration</Subheading>
        <Paragraph>
          Convert x/y to CSS by mapping them to <code>left</code> and{" "}
          <code>top</code> on an absolutely-positioned element inside a{" "}
          <code>position: relative</code> container. Use CSS{" "}
          <code>clamp()</code> to keep the content block inside the frame at
          any screen size.
        </Paragraph>
        <code style={codeStyle}>{`// React / TypeScript example
function anchorToStyle(anchor: { x: number; y: number }) {
  return {
    position: "absolute" as const,
    left: \`clamp(2%, calc(\${anchor.x * 100}% - 22%), calc(100% - 46%))\`,
    top:  \`clamp(4%, calc(\${anchor.y * 100}% - 15%), calc(100% - 34%))\`,
    maxWidth: "44%",
  };
}

// Usage — container must be position: relative with overflow: hidden
<div style={{ position: "relative", overflow: "hidden" }}>
  <img src={imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  <div style={anchorToStyle(entry.fields.textAnchor)}>
    <h2>{entry.fields.headline}</h2>
  </div>
</div>`}</code>

        <Text
          as="p"
          fontColor="gray600"
          fontSize="fontSizeS"
          style={{ marginTop: 10 }}
        >
          The clamp bounds above assume a text block that is at most 44% of the
          container width. Adjust the percentages to match your actual layout.
        </Text>
      </Box>

      <Note variant="neutral" style={{ marginTop: 24 }}>
        <strong>Quick setup</strong>
        <ol style={{ margin: "8px 0 0 16px", padding: 0, fontSize: 13, lineHeight: 1.8 }}>
          <li>Add a JSON Object field to your content type (e.g. <code>textAnchor</code>).</li>
          <li>Open the field → Appearance tab → select <strong>Content Anchor</strong>.</li>
          <li>Read <code>fields.textAnchor</code> in your frontend and apply the style above.</li>
        </ol>
      </Note>
    </Box>
  );
}
