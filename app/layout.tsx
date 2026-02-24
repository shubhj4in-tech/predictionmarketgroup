import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Friend Markets",
  description: "Private prediction markets for friend groups",
  openGraph: {
    title: "Friend Markets",
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
      <body className="min-h-screen bg-[#0a0a0a] text-[#f0f0f0]">
        {children}
      </body>
    </html>
  );
}
