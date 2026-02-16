import React, { FC, ReactNode } from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";

interface IProps {
  entryId: string; // Unique entry ID for live preview inspector mode
  title: string; // Main heading of the hero banner
  body?: string; // Optional subtext
  images: string[]; // Array of image URLs
  buttons: ReactNode; // Buttons passed as children
  imagePlacement?: "Left" | "Right";
}

const SimpleCta: FC<IProps> = ({ title, body, images, buttons, entryId, imagePlacement }) => {
  const inspectorProps = useContentfulInspectorMode({ entryId });
  const placement = imagePlacement === "Left" ? "Left" : "Right";

  return (
    <section className="relative overflow-hidden">
      
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Text Section */}
          <div className={placement === "Left" ? "order-2 lg:order-2" : "order-2 lg:order-1"}>
            <h2
              {...inspectorProps({ fieldId: "title" })}
              className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-4 text-balance"
            >
              {title}
            </h2>

            {/* Optional body text */}
            {body && (
              <p
                {...inspectorProps({ fieldId: "body" })}
                className="text-lg text-muted-foreground mb-8 max-w-md leading-relaxed"
              >
                {body}
              </p>
            )}
            <div className="flex items-center gap-4">
              {buttons}
            </div>
          </div>

          {/* Image Section with Conditional Grid Layout */}
          <div className={placement === "Left" ? "order-1 lg:order-1 relative" : "order-1 lg:order-2 relative"}>
            <div
              className={cn(
                "grid gap-4",
                images?.length === 1 && "grid-cols-1", // Single image takes full width
                images?.length === 3 && "grid-cols-2 grid-rows-2", // Three images: two in a row, third spans full width
                images?.length !== 1 && images?.length !== 3 && "grid-cols-2" // Default grid for even numbers
              )}
            >
              {Array.isArray(images) &&
                images.map((image, index) => (
                  <div
                    key={`key-${index}`}
                    className={cn(
                      "aspect-[4/3] rounded-2xl overflow-hidden bg-secondary",
                      images.length === 3 && index === 2 && "col-span-2" // Third image in a 3-image set spans full width
                    )}
                  >
                    <img
                      alt=""
                      src={image}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-accent/20 rounded-full blur-2xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default SimpleCta;
