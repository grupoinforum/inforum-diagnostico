import "./globals.css";
import Image from "next/image";

export const metadata = {
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
        {/* HEADER */}
        <header className="bg-[#082349] text-white px-6 py-3 flex items-center">
          <Image
            src="/logo-inforum.png"
            alt="Inforum"
            width={160}
            height={40}
            className="h-10 w-auto object-contain"
          />
          <h1 className="ml-3 text-lg font-bold">Diagnóstico</h1>
        </header>

        {/* CONTENIDO */}
        <main className="flex-grow">{children}</main>

        {/* FOOTER */}
        <footer className="w-full">
          <Image
            src="/footer-inforum.jpg"
            alt="Footer Inforum"
            width={1920}
            height={300}
            className="w-full h-auto object-cover"
            priority
          />
        </footer>
      </body>
    </html>
  );
}

