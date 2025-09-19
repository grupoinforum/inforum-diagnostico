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
              src="/logo-inforum.png"
              alt="Inforum"
              width={160}
              height={40}
              className="h-10 w-auto object-contain"
              priority
            />
            <span className="text-lg font-semibold">Diagnóstico</span>
          </div>
        </header>

        {/* MAIN */}
        <main className="flex-1">{children}</main>

      <footer className="w-full mt-10">
  <img
    src="/footer-inforum.jpg"
    alt="Footer Inforum"
    className="w-full object-cover"
  />
</footer>

