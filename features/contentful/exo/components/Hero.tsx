'use client';

type HeroProps = {
  headline?: string;
  alignment?:"Left"  | "Right";
};

export function Hero({ headline, alignment = "Left" }: HeroProps) {
  
  return (
    <section
      style={{
        padding: '64px 24px',
        textAlign : alignment === "Right" ? "right" : "left",
      }}
    >
      <h1>{headline}</h1>
    </section>
  );
}
