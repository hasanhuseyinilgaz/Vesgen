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
      {/* Removed heavy glow/noise animations to optimize CPU */}

      {sidebar && (
        <aside className="h-full shrink-0 z-10 relative overflow-hidden">
          {sidebar}
        </aside>
      )}

      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative z-10">
        {children}
      </main>
    </div>
  );
}
