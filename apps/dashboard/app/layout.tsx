import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrackKit Dashboard",
  description: "Manage your deliveries, drivers, and API keys",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
