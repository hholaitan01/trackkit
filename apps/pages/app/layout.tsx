import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TrackKit — Real-time Delivery Tracking Infrastructure",
  description: "Drop-in tracking infrastructure for delivery and ride-sharing apps. Embeddable widget, REST API, real-time WebSockets. Built on OpenStreetMap.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
