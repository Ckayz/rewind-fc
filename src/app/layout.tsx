import type { Metadata } from "next";
import { Barlow_Condensed, Archivo } from "next/font/google";
import Link from "next/link";
import { WalletProviders } from "@/components/WalletProviders";
import { WalletButton } from "@/components/WalletButton";
import "./globals.css";

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Rewind FC — World Cup Time Machine",
  description:
    "Replay every World Cup 2026 match as if it were live — real odds movement, on-chain verified data, and wallet-signed predictions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${archivo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <WalletProviders>
        <header className="sticky top-0 z-50 glass border-x-0 border-t-0">
          <nav className="mx-auto flex w-full max-w-6xl items-center gap-5 px-4 py-3">
            <Link href="/" className="flex items-baseline gap-1.5">
              <span className="score-digits text-2xl leading-none text-volt volt-glow">
                REWIND
              </span>
              <span className="score-digits text-2xl leading-none text-pitch-50">
                FC
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-4 font-display text-lg font-semibold uppercase tracking-wide text-pitch-300">
              <Link href="/bracket" className="hover:text-volt transition-colors">
                Bracket
              </Link>
              <Link href="/matches" className="hover:text-volt transition-colors">
                Matches
              </Link>
              <Link
                href="/leaderboard"
                className="hover:text-volt transition-colors"
              >
                Leaders
              </Link>
              <WalletButton />
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24">
          {children}
        </main>
        <footer className="border-t border-pitch-700/40 py-6 text-center text-sm text-pitch-400">
          Rewind FC — powered by TxLINE on Solana · data anchored on-chain
        </footer>
        </WalletProviders>
      </body>
    </html>
  );
}
