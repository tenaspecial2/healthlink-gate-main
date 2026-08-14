import logo from "@/assets/tena-logo.png";
import { cn } from "@/lib/utils";

export function BrandLogo({
  className,
  size = 40,
  showText = true,
  subtitle,
}: {
  className?: string;
  size?: number;
  showText?: boolean;
  subtitle?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <img
        src={logo}
        alt="Tena Specal logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0"
      />
      {showText && (
        <div className="leading-tight">
          <div className="font-display text-lg font-bold tracking-tight">Tena Specal</div>
          <div className="text-[11px] font-medium text-muted-foreground">
            {subtitle ?? "Specialized Healthcare Portal"}
          </div>
        </div>
      )}
    </div>
  );
}
