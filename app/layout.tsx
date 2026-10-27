import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TNB Business Solutions Portal",
  description: "A private vendor management and healthcare business credentialing workspace for TNB Business Solutions.",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
