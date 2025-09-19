import "./globals.css";
import Image from "next/image";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen bg-gray-50">
        {/* Contenido principal */}
        <main className="flex-grow">{children}</main>

        {/* Footer */}
        <footer className="w-full mt-auto">
          <Image
            src="/footer-web.jpg"
            alt="Footer Inforum"
            width={1920}
            height={250}
            className="w-full h-auto object-cover"
            priority
          />
        </footer>
      </body>
    </html>
  );
}
