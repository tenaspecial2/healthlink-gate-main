import { Star } from "lucide-react";

export function StarRating({
  value,
  onChange,
  size = 20,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const cls = filled ? "fill-current text-warning" : "text-muted-foreground";
        if (!onChange) {
          return <Star key={n} className={cls} style={{ width: size, height: size }} />;
        }
        return (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => onChange(n)}
            className="transition-transform hover:scale-110"
          >
            <Star className={cls} style={{ width: size, height: size }} />
          </button>
        );
      })}
    </div>
  );
}

export function OnlineDot({ online, label = true }: { online: boolean; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span
        className={`inline-block h-2.5 w-2.5 rounded-full ${
          online ? "bg-success" : "bg-muted-foreground/50"
        }`}
        aria-hidden
      />
      {label && (online ? "Online" : "Offline")}
    </span>
  );
}
