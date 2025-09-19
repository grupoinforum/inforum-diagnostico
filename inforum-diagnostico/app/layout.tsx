// app/layout.tsx
import "./globals.css";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inforum Diagnóstico",
  description: "Ir directo al cuestionario",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen bg-gray-50">
        {/* ===== HEADER (como antes) ===== */}
        <header className="bg-[#082349] text-white">
          <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 py-3">
            <Image
              src="/logo-inforum.png"   // Debe existir en /public
              alt="Inforum"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
            <h1 className="text-lg font-semibold">Diagnóstico</h1>
          </div>
        </header>

        {/* ===== CONTENIDO ===== */}
        <main className="flex-grow">{children}</main>

        {/* ===== FOOTER (imagen nueva) ===== */}
        <footer className="w-full mt-auto">
          <Image
            src="/footer-web.jpg"       // Nombre EXACTO en /public
            alt="Footer Inforum"
            width={1920}
            height={260}
            className="w-full h-auto object-cover"
            priority
          />
        </footer>
      </body>
    </html>
  );
}

