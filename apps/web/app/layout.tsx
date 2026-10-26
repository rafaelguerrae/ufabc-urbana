import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "UFABC Urbana",
  description: "Descubra por que algumas partes de São Paulo são mais quentes e como a vegetação se relaciona com o calor na cidade.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
