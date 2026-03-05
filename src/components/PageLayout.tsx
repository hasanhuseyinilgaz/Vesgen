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
    <div className={`flex h-full bg-muted/10 overflow-hidden ${className}`}>
      {sidebar && <aside className="h-full shrink-0 border-r">{sidebar}</aside>}

      <main className="flex-1 flex flex-col min-w-0 bg-background h-full overflow-hidden relative">
        {children}
      </main>
    </div>
  );
}
