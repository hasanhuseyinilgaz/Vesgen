import { ReactNode } from "react";

interface PageLayoutProps {
  sidebar?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function PageLayout({
  sidebar,
  children,
  className = "",
}: PageLayoutProps) {
  return (
    <div className={`flex h-full bg-background overflow-hidden relative ${className}`}>
      {/* Background Glow Effects - Centralized Single Spot */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center">
        <div className="bg-glow-spotlight animate-float opacity-60" />
      </div>

      {sidebar && (
        <aside className="h-full shrink-0 border-r bg-card/30 backdrop-blur-sm z-10 relative">
          {sidebar}
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {children}
      </main>
    </div>
  );
}
