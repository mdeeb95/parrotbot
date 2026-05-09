import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parrot — Chat that answers itself",
  description:
    "Parrot is a Twitch chat bot that answers viewer questions about your stream — server, build, addons, schedule, links — so you don't have to.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg text-text font-sans">{children}</body>
    </html>
  );
}
