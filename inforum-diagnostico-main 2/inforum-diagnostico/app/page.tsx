
import Link from "next/link";

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Inforum • Diagnóstico</h1>
      <p className="text-gray-600 mb-6">Ir directo al cuestionario.</p>
      <Link
        href="/diagnostico"
        className="inline-block px-5 py-3 rounded-2xl shadow bg-blue-600 text-white"
      >
        Abrir diagnóstico
      </Link>
    </main>
  );
}
