import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NomadPass | Verify once. Use everywhere.",
  description:
    "Agent-powered onchain credential wallet for digital nomads, freelancers, and global professionals."
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
