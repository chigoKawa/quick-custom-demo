import React, { FC, ReactNode } from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { LongText } from "@/features/contentful/components/long-text";

interface IProps {
  entryId: string; // Unique ID for the entry used for live preview inspector mode
  title: ReactNode; // The main heading of the hero banner
  titlePlain?: string; // Plain-text version for alt attributes
  body?: string; // Optional subtext for additional information
  image?: { url: string; alt: string }; // Background image with alt text for accessibility
  buttons: ReactNode; // Buttons passed as children (can be multiple buttons from Contentful)
}
const VariantCentered: FC<IProps> = ({ title, titlePlain, body, buttons, entryId, image }) => {
  const inspectorProps = useContentfulInspectorMode({ entryId });
  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-8 md:py-16 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-center">
          {/* Content - Centered */}
          <div className="order-1 lg:order-1 lg:col-span-2 text-center">
            <h1
              {...inspectorProps({ fieldId: "headline" })}
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-3 text-balance"
            >
              {title}
            </h1>

            {/* Optional body text */}
            {body && (
              <LongText
                text={body}
                inspectorProps={inspectorProps({ fieldId: "body" })}
                className="text-base md:text-lg text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed"
              />
            )}

            {/* Button section */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-center gap-3 [&>*]:w-full [&>*]:sm:w-auto">{buttons}</div>
          </div>

          {/* Image - Hidden in centered variant or optional */}
          {image && (
            <div className="order-1 lg:order-2 relative lg:col-span-2">
              <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-secondary max-w-2xl mx-auto">
                {image.url ? (
                  <img
                    src={image.url}
                    alt={image.alt || titlePlain || ""}
                    className="w-full h-full object-cover"
                  />
                ) : null}
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
