import React, { FC, ReactNode } from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";

interface IProps {
  entryId: string; // Unique ID for the entry used for live preview inspector mode
  title: string; // The main heading of the hero banner
  body?: string; // Optional subtext for additional information
  image?: { url: string; alt: string }; // Background image with alt text for accessibility
  buttons: ReactNode; // Buttons passed as children (can be multiple buttons from Contentful)
}
const VariantCentered: FC<IProps> = ({ title, body, buttons, entryId, image }) => {
  const inspectorProps = useContentfulInspectorMode({ entryId });
  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content - Centered */}
          <div className="order-2 lg:order-1 lg:col-span-2 text-center">
            <h1
              {...inspectorProps({ fieldId: "headline" })}
              className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance"
            >
              {title}
            </h1>

            {/* Optional body text */}
            {body && (
              <p
                {...inspectorProps({ fieldId: "body" })}
                className="text-lg text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed"
              >
                {body}
              </p>
            )}

            {/* Button section */}
            <div className="flex items-center justify-center gap-4">{buttons}</div>
          </div>

          {/* Image - Hidden in centered variant or optional */}
          {image && (
            <div className="order-1 lg:order-2 relative lg:col-span-2">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-secondary max-w-2xl mx-auto">
                <img
                  src={image.url}
                  alt={image.alt || title}
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Decorative element */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default VariantCentered;
