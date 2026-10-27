import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BankOps.dev — Compliance evidence, engineered",
  description: "Compliance Evidence Automation for Financial Infrastructure. An early product vision for connecting infrastructure changes, evidence, and review.",
  icons: { icon: "/favicon.svg" },
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
