import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfits = Outfit({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "LSHD1 Screening System",
  description: "Health screening management system",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={outfits.className}>{children}</body>
    </html>
  );
}
