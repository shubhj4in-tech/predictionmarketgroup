import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Polymarket for Friends",
  description: "Private prediction markets for friend groups",
  openGraph: {
    title: "Polymarket for Friends",
    description: "Private prediction markets for friend groups",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
