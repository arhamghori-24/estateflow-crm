import { Card } from "@/components/ui/card";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  tone?: "default" | "success" | "warning" | "danger";
  subtitle?: string;
}
const toneMap = {
  default: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-destructive/10 text-destructive",
};

export function MetricCard({ title, value, icon: Icon, href, tone = "default", subtitle }: Props) {
  const inner = (
    <Card className="p-4 transition-all hover:shadow-md hover:-translate-y-0.5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className="mt-2 text-2xl font-bold">{value}</p>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn("rounded-lg p-2", toneMap[tone])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
