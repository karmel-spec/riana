import type { Metadata, Viewport } from "next";
import { Lora, Source_Sans_3 } from "next/font/google";
import "./globals.css";

const display = Lora({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display" });
const body = Source_Sans_3({ subsets: ["latin"], weight: ["400", "600", "700"], variable: "--font-body" });

export const metadata: Metadata = {
  title: { default: "Rich & Diana Greene", template: "%s · Rich & Diana Greene" },
  description: "A private home for everything the Greene family needs to care for Rich and Diana.",
  robots: { index: false, follow: false },
  applicationName: "Rich & Diana Greene",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Greene Binder" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2f5141",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`} suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
