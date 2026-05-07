import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: LucideIcon;
  variant?: "default" | "accent" | "success" | "warning" | "danger";
}

const variantStyles = {
  default: "bg-card border border-border shadow-card",
  accent: "bg-primary text-primary-foreground border border-primary",
  success: "bg-card border border-border shadow-card border-l-4 border-l-success",
  warning: "bg-card border border-border shadow-card border-l-4 border-l-warning",
  danger: "bg-card border border-destructive shadow-card border-l-4 border-l-destructive",
};

const iconVariantStyles = {
  default: "bg-muted text-muted-foreground",
  accent: "bg-primary-foreground/10 text-primary-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export default function StatCard({ label, value, change, icon: Icon, variant = "default" }: StatCardProps) {
  return (
    <div className={cn("rounded-xl p-5 transition-all hover:shadow-card-hover", variantStyles[variant])}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn("text-sm font-medium", variant === "accent" ? "text-primary-foreground/70" : "text-muted-foreground")}>
            {label}
          </p>
          <p className="mt-1 font-display text-3xl font-bold">{value}</p>
          {change && (
            <p className={cn("mt-1 text-xs font-medium", variant === "accent" ? "text-primary-foreground/60" : "text-muted-foreground")}>
              {change}
            </p>
          )}
        </div>
        <div className={cn("rounded-lg p-2.5", iconVariantStyles[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
