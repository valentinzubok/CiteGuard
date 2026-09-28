import type { Metadata } from "next";
import { WalletProvider } from "@/components/WalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "CiteGuard",
  description:
    "Citation integrity on GenLayer Studio Dev (chain 61997): a claim is registered with the source that must back it, and validators re-read that source to decide whether the citation still holds.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
