import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "UFABC Urbana",
  description: "Explore how urbanization and vegetation relate to surface temperature across São Paulo districts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
