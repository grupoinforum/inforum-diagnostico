import "./globals.css";
import Image from "next/image";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "Inforum · Diagnóstico",
  description: "Cuestionario de diagnóstico",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={montserrat.className}>
        {/* HEADER */}
        <header className="bg-brand-navy text-white py-3">
          <div className="mx-auto max-w-6xl flex items-center gap-3 px-6">
            <Image
              src="/logo-inforum.png"
              alt="Inforum"
              width={160}
              height={40}
              className="h-9 w-auto object-contain"
            />
            <h1 className="text-lg font-semibold">Diagnóstico</h1>
          </div>
        </header>

        {/* MAIN */}
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>

        {/* FOOTER */}
        <footer className="mt-12 bg-brand-navy text-white">
          <div className="mx-auto max-w-6xl px-6 py-8 grid gap-8 md:grid-cols-2">
            <div>
              <Image
                src="/logo-inforum.png"
                alt="Inforum"
                width={160}
                height={40}
                className="h-8 w-auto object-contain mb-3"
              />
              <p className="text-white/70 text-sm">
                © {new Date().getFullYear()} Inforum. Todos los derechos reservados.
              </p>
            </div>

            <div>
              <p className="font-semibold text-white/90">Guatemala</p>
              <p className="text-white/75">(+502) 2477 3400</p>
              <p className="text-white/70">
                6a Av 7-39 zona 10, Edif. Las Brisas, Of. 302
              </p>
            </div>
          </div>
          <div className="border-t border-white/10">
