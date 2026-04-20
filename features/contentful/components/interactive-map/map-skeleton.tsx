export default function MapSkeleton() {
  return (
    <div className="relative w-full aspect-[2/1] md:aspect-[5/2] rounded-xl overflow-hidden bg-muted animate-pulse">
      {/* Faux grid lines */}
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="border border-border/20" />
        ))}
      </div>

      {/* Fake pin placeholders */}
      <div className="absolute top-1/3 left-1/4 flex flex-col items-center gap-1 opacity-30">
        <div className="w-6 h-6 rounded-full bg-primary" />
        <div className="w-1 h-3 bg-primary rounded-b" />
      </div>
      <div className="absolute top-1/2 left-1/2 flex flex-col items-center gap-1 opacity-30">
        <div className="w-6 h-6 rounded-full bg-primary" />
        <div className="w-1 h-3 bg-primary rounded-b" />
      </div>
      <div className="absolute top-1/4 right-1/3 flex flex-col items-center gap-1 opacity-30">
        <div className="w-6 h-6 rounded-full bg-primary" />
        <div className="w-1 h-3 bg-primary rounded-b" />
      </div>

      {/* Loading label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background/80 backdrop-blur-sm px-4 py-2 rounded-lg">
          <p className="text-sm text-muted-foreground font-medium">Loading map&hellip;</p>
        </div>
      </div>
    </div>
  );
}
