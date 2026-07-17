import type { Metadata } from "next";
import { Barlow_Condensed, Archivo } from "next/font/google";
import Link from "next/link";
import { WalletProviders } from "@/components/WalletProviders";
import { WalletButton } from "@/components/WalletButton";
import { ThemeToggle } from "@/components/ThemeToggle";
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
      data-theme="dark"
      suppressHydrationWarning
      className={`${barlow.variable} ${archivo.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("rewindfc_theme")||(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");document.documentElement.setAttribute("data-theme",t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <WalletProviders>
        <header className="sticky top-0 z-50 glass border-x-0 border-t-0">
          <nav className="mx-auto flex w-full max-w-[1920px] items-center gap-3 px-5 py-3 sm:px-8">
            <Link href="/" className="flex items-baseline gap-1.5">
              <span className="score-digits text-xl leading-none text-volt volt-glow sm:text-2xl">
                REWIND
              </span>
              <span className="score-digits text-xl leading-none text-pitch-50 sm:text-2xl">
                FC
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-3 text-sm font-semibold text-pitch-300 sm:gap-4">
              <Link
                href="/demo"
                className="text-live/80 hover:text-live transition-colors"
              >
                Demo
              </Link>
              <Link
                href="/final"
                className="text-gold hover:text-accent transition-colors"
              >
                Final
              </Link>
              <Link href="/bracket" className="hover:text-accent transition-colors">
                Bracket
              </Link>
              <Link href="/matches" className="hover:text-accent transition-colors">
                Matches
              </Link>
              <Link
                href="/leaderboard"
                className="hover:text-accent transition-colors"
              >
                Leaders
              </Link>
              <Link href="/pulse" className="hover:text-accent transition-colors">
                Pulse
              </Link>
              <Link href="/lab" className="hover:text-accent transition-colors">
                Lab
              </Link>
              <Link href="/desk" className="hover:text-accent transition-colors">
                Desk
              </Link>
              <Link
                href="/proofs"
                className="text-verify/80 hover:text-verify transition-colors"
              >
                Proofs
              </Link>
              <ThemeToggle />
              <WalletButton />
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-[1920px] flex-1 px-5 pb-24 sm:px-8">
          {children}
        </main>
        <footer className="border-t border-pitch-700/40 py-6 text-center text-sm text-pitch-400">
          Rewind FC — powered by{" "}
          <Link href="/about" className="text-volt hover:underline">
            TxLINE on Solana
          </Link>{" "}
          · data anchored on-chain
        </footer>
        </WalletProviders>
      </body>
    </html>
  );
}
