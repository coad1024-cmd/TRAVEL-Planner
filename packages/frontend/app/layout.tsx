import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { ThemeProvider } from '../components/theme-provider';
import ThemeToggle from './ThemeToggle';

export const metadata: Metadata = {
  title: 'TravelAI — Intelligent Trip Planning',
  description: 'Multi-agent AI travel planning system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  <svg viewBox="0 0 24 24" fill="none" className="w-4.5 h-4.5 text-primary-foreground" width="18" height="18">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight text-foreground">
                  Travel<span className="text-primary">AI</span>
                </span>
              </Link>

              <nav className="hidden md:flex items-center gap-1">
                <Link href="/" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                  Plan Trip
                </Link>
                <Link href="/interact" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                  Voice Assistant
                </Link>
                <Link href="/profile" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors">
                  Profile
                </Link>
              </nav>

              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Link
                  href="/"
                  className="hidden md:inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <svg viewBox="0 0 24 24" fill="none" width="16" height="16" className="shrink-0">
                    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                  New Trip
                </Link>
              </div>
            </div>
          </header>

          <main className="max-w-6xl mx-auto px-4 py-8 animate-fade-in">
            {children}
          </main>

          <footer className="border-t border-border mt-16">
            <div className="max-w-6xl mx-auto px-4 py-6 flex items-center justify-between text-xs text-muted-foreground">
              <span>© 2026 TravelAI — Powered by multi-agent AI</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse"></span>
                <span>System operational</span>
              </div>
            </div>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
