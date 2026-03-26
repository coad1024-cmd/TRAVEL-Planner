import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'TravelAI',
  description: 'Multi-agent travel planning system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <header className="bg-indigo-700 text-white shadow-md">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold tracking-tight hover:text-indigo-200 transition-colors">
              TravelAI
            </Link>
            <nav className="flex gap-6">
              <Link
                href="/"
                className="text-indigo-100 hover:text-white font-medium transition-colors"
              >
                Trip Planner
              </Link>
              <Link
                href="/profile"
                className="text-indigo-100 hover:text-white font-medium transition-colors"
              >
                Profile
              </Link>
            </nav>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
