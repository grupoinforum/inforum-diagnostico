"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

// 🔹 Forzar renderizado dinámico (no prerender en build)
export const dynamic = "force-dynamic";

// ---- Configuración del cuestionario ----
const QUESTIONS = [
  {
    id: "industria",
    label: "¿En qué industria opera la compañía?",
    type: "single" as const,
    options: [
      { value: "produccion", label: "Producción", score: 2 },
      { value: "distribucion", label: "Distribución", score: 2 },
      { value: "retail", label: "Retail", score: 2 },
      { value: "servicios", label: "Servicios", score: 1 },
    ],
  },
  {
    id: "sistema",
    label: "¿Actualmente usan un ERP o sistema contable?",
    type: "single" as const,
    options: [
      { value: "sap", label: "SAP Business One", score: 2 },
      { value: "otro", label: "Otro ERP", score: 2 },
      { value: "ninguno", label: "Ninguno", score: 1 },
    ],
  },
  {
    id: "usuarios",
    label: "¿Cuántos usuarios manejan el sistema?",
    type: "single" as const,
    options: [
      { value: "menos10", label: "Menos de 10", score: 1 },
      { value: "10a50", label: "10 a 50", score: 2 },
      { value: "50plus", label: "Más de 50", score: 2 },
    ],
  },
  {
    id: "infraestructura",
    label: "¿Dónde alojan su infraestructura principal?",
    type: "single" as const,
    options: [
      { value: "nube", label: "Nube pública/privada", score: 2 },
      { value: "onprem", label: "On-premise (servidores propios)", score: 2 },
      { value: "mixto", label: "Híbrido", score: 2 },
    ],
  },
  {
    id: "ciberseguridad",
    label: "¿Cuentan con soluciones de ciberseguridad activas?",
    type: "single" as const,
    options: [
      { value: "basica", label: "Firewall básico / Antivirus", score: 1 },
      { value: "avanzada", label: "Firewall empresarial + WAF/EDR", score: 2 },
      { value: "ninguna", label: "Ninguna", score: 1 },
    ],
  },
  {
    id: "respaldo",
    label: "¿Tienen políticas de respaldo y recuperación?",
    type: "single" as const,
    options: [
      { value: "si", label: "Sí, estructuradas y probadas", score: 2 },
      { value: "parcial", label: "Parcialmente", score: 1 },
      { value: "no", label: "No", score: 1 },
    ],
  },
  {
    id: "contacto",
    label: "¿Podemos contactarle para compartir un diagnóstico más completo?",
    type: "single" as const,
    options: [
      { value: "si", label: "Sí", score: 2 },
      { value: "no", label: "No", score: 1 },
    ],
  },
];

// ---- Componente principal ----
export default function DiagnosticoContent() {
  const searchParams = useSearchParams();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (Object.keys(answers).length === QUESTIONS.length) {
      const score = QUESTIONS.reduce((acc, q) => {
        const option = q.options.find((o) => o.value === answers[q.id]);
        return acc + (option?.score || 0);
      }, 0);
      setResult(score >= 10 ? "Califica" : "Sin cupo");
    }
  }, [answers]);

  return (
    <div className="max-w-2xl mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">
        Diagnóstico Inforum
      </h1>

      {QUESTIONS.map((q) => (
        <div key={q.id} className="mb-6">
          <p className="font-medium">{q.label}</p>
          <div className="space-x-4">
            {q.options.map((o) => (
              <label key={o.value} className="mr-4">
                <input
                  type="radio"
                  name={q.id}
                  value={o.value}
                  checked={answers[q.id] === o.value}
                  onChange={(e) =>
                    setAnswers((prev) => ({
                      ...prev,
                      [q.id]: e.target.value,
                    }))
                  }
                />{" "}
                {o.label}
              </label>
            ))}
          </div>
        </div>
      ))}

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p className="font-semibold">
            Resultado:{" "}
            <span className={result === "Califica" ? "text-green-600" : "text-red-600"}>
              {result}
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
