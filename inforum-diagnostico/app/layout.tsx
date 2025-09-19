// app/layout.tsx
import "./globals.css";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Inforum Diagnóstico",
  description: "Aplicación de diagnóstico de Inforum",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen bg-gray-50">
        {/* HEADER (sin menú) */}
        <header className="bg-[#082349] text-white">
          <div className="max-w-7xl mx-auto flex items-center gap-4 px-6 py-3">
            <Image
              src="/logo-inforum.png" // asegúrate que este archivo exista en /public
              alt="Inforum"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
            <span className="text-lg font-semibold">Diagnóstico</span>
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-1">{children}</main>

        {/* FOOTER con tu imagen */}
        <footer className="w-full mt-10">
          <img
            src="/footer.jpg" // pon aquí el nombre exacto del archivo en /public
            alt="Footer Inforum"
            className="w-full h-auto object-cover"
          />
        </footer>
      </body>
    </html>
  );
}

