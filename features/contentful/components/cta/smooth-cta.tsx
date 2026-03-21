import React, { FC, ReactNode } from "react";
import { useContentfulInspectorMode } from "@contentful/live-preview/react";
import { cn } from "@/lib/utils";

type BackgroundColor = "Default" | "Primary" | "Secondary" | "None";

interface IProps {
  entryId: string; // Unique entry ID for live preview inspector mode
  title: string; // Main heading of the hero banner
  body?: string; // Optional subtext
  images: string[]; // Array of image URLs
  buttons: ReactNode; // Buttons passed as children
  imagePlacement?: "Left" | "Right";
  backgroundColor?: BackgroundColor;
}

const bgColorClasses: Record<BackgroundColor, string> = {
  Default: "bg-muted/50",
  Primary: "bg-primary/10",
  Secondary: "bg-secondary",
  None: "bg-transparent",
};

const SmoothCta: FC<IProps> = ({ title, body, images, buttons, entryId, imagePlacement, backgroundColor = "Default" }) => {
  const inspectorProps = useContentfulInspectorMode({ entryId });
  const placement = imagePlacement === "Left" ? "Left" : "Right";
  const bgClass = bgColorClasses[backgroundColor] || bgColorClasses.Default;

  return (
    <section className={cn("relative overflow-hidden", bgClass)}>
      <div className="max-w-7xl mx-auto px-4 py-12 md:py-20">
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
                images.filter(Boolean).map((image, index, filtered) => (
                  <div
                    key={`key-${index}`}
                    className={cn(
                      "flex items-center justify-center",
                      filtered.length === 3 && index === 2 && "col-span-2"
                    )}
                  >
                    <img
                      alt=""
                      src={image}
                      className="max-w-full max-h-[380px] w-auto h-auto object-contain rounded-xl"
                      style={{ filter: "drop-shadow(0 10px 30px rgba(0,0,0,0.08))" }}
                    />
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SmoothCta;
