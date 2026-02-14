import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prompt Manager',
  description: 'Prompt management workspace with versioning and publishing',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="ambient" aria-hidden="true" />
        <header className="topbar">
          <div className="container topbar-inner">
            <Link href="/" className="brand">
              Prompt Manager
            </Link>
            <nav className="nav">
              <Link href="/workspace" className="nav-link">
                Workspace
              </Link>
              <Link href="/public" className="nav-link">
                Public
              </Link>
            </nav>
          </div>
        </header>
        <main className="container page-shell">{children}</main>
      </body>
    </html>
  );
}
