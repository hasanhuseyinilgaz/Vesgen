import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
}: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
      <div className="p-8 bg-card rounded-2xl shadow-sm border border-border/50 flex flex-col items-center text-center">
        <Icon className="w-16 h-16 mb-4 text-primary/40" />
        <p className="text-lg font-medium text-foreground">{title}</p>
        <div className="text-sm mt-1 max-w-[250px]">{description}</div>
      </div>
    </div>
  );
}
