import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Torneo Trives",
  description: "Gestion y seguimiento del torneo de futbol sala Torneo Trives.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
