// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Inforum · Diagnóstico",
  description: "Cuestionario de diagnóstico",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=AW-385774897"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'AW-385774897');
            `,
          }}
        />

        {/* === Microsoft Clarity (versión en HEAD oficial) === */}
        <Script id="clarity" strategy="beforeInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "tnlhp2hkhd");

            // Ping automático al inicializar Clarity
            window.addEventListener('load', function() {
              const waitForClarity = setInterval(() => {
                if (typeof window.clarity === 'function') {
                  window.clarity('identify', 'valerie-auto-ping');
                  clearInterval(waitForClarity);
                  console.log('✅ Clarity identificado automáticamente');
                }
              }, 1000);
            });
          `}
        </Script>
      </head>

      <body className="min-h-screen bg-white text-gray-900 antialiased flex flex-col">
        {/* HEADER full-width con cintillo azul */}
        <header className="w-full bg-[#082a49]">
          <div className="max-w-5xl mx-auto px-4 py-3 flex items-center">
            <Image
              src="/logo-inforum.png"
              alt="Inforum"
              width={160}
              height={40}
              priority
            />
          </div>
        </header>

        {/* CONTENIDO */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
          {children}
        </main>

        {/* FOOTER full-width */}
        <footer className="w-full">
          {/* Desktop */}
          <div className="hidden md:block">
            <Image
              src="/footer-web.jpg"
              alt="Footer Inforum"
              width={1920}
              height={300}
              className="w-full h-auto"
            />
          </div>
          {/* Mobile */}
          <div className="block md:hidden">
            <Image
              src="/footer-mobile.jpg"
              alt="Footer Inforum móvil"
              width={768}
              height={200}
              className="w-full h-auto"
            />
          </div>
        </footer>
      </body>
    </html>
  );
}
