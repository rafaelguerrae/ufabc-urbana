import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "UFABC Urbana",
  description: "Descubra por que algumas partes de São Paulo, São Bernardo do Campo e Santo André são mais quentes e como a vegetação se relaciona com o calor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body cz-shortcut-listen="true">
        {children}
      </body>
    </html>
  );
}
