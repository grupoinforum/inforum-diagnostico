// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inforum · Diagnóstico",
  description: "Cuestionario de diagnóstico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
