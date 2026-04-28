import React, { FC, ReactNode } from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";
import { LongText } from "@/features/contentful/components/long-text";
interface IProps {
  alignRight?: boolean; // Optional prop to align the text and buttons to the right side
  entryId: string; // Unique ID for the entry used for live preview inspector mode
  title: string; // The main heading of the hero banner
  body?: string; // Optional subtext for additional information
  image: { url: string; alt: string }; // Background image with alt text for accessibility
  buttons: ReactNode; // Buttons passed as children (can be multiple buttons from Contentful)
}

const VariantPrimary: FC<IProps> = ({
  title,
  body,
  image,
  buttons,
  entryId,
  alignRight,
}) => {
  const inspectorProps = useContentfulInspectorMode({ entryId });
  return (
    <section className="relative overflow-hidden">
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Content */}
          <div className={cn("order-2 lg:order-1", alignRight ? "lg:order-2" : "")}>
            <h1
              {...inspectorProps({ fieldId: "headline" })}
              className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance"
            >
              {title}
            </h1>

            {/* Optional body text */}
            {body && (
              <LongText
                text={body}
                inspectorProps={inspectorProps({ fieldId: "body" })}
                className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed"
              />
            )}

            {/* Button section */}
            <div className="flex items-center gap-4">{buttons}</div>
          </div>

          {/* Image */}
          <div className={cn("order-1 lg:order-2 relative", alignRight ? "lg:order-1" : "")}>
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-secondary">
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.alt || title}
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default VariantPrimary;
