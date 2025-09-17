// ===============================
// FILE: app/diagnostico/page.tsx
// ===============================
"use client";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

// 🚀 Forzar renderizado dinámico (evita error de prerender en Vercel)
export const dynamic = "force-dynamic";

// ---- Configuración del cuestionario
const QUESTIONS = [ /* ... tu mismo contenido de preguntas ... */ ] as const;

type Answer = {
  id: string;
  value: string;
  score: 1 | 2;
  extraText?: string;
};

const COUNTRIES = [
  { value: "GT", label: "Guatemala" },
  { value: "SV", label: "El Salvador" },
  { value: "HN", label: "Honduras" },
  { value: "PA", label: "Panamá" },
  { value: "DO", label: "República Dominicana" },
  { value: "EC", label: "Ecuador" },
] as const;

type CountryValue = typeof COUNTRIES[number]["value"];

const FREE_EMAIL_DOMAINS = [
  "gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com","proton.me","aol.com","live.com","msn.com"
];
function isCorporateEmail(email: string) {
  const domain = email.split("@").pop()?.toLowerCase().trim();
  if (!domain) return false;
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

export default function DiagnosticoPage() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, Answer | undefined>>({});
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    country: "GT" as CountryValue,
    consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [serverResp, setServerResp] = useState<null | { ok: boolean; message: string; title: string; resultKey: "califica" | "nocupo" }>(null);

  const [error, setError] = useState<string | null>(null); // 🚀 reemplazo del alert

  const utms = useMemo(() => {
    const keys = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"] as const;
    const x: Record<string,string> = {};
    keys.forEach(k => { const v = searchParams.get(k); if (v) x[k] = v; });
    return x;
  }, [searchParams]);

  const progressPct = useMemo(() => (step / 3) * 100, [step]);

  const handleSelect = (qid: string, optionValue: string) => {
    const q = QUESTIONS.find(q => q.id === qid)!;
    const opt = q.options.find(o => o.value === optionValue)!;
    setAnswers(prev => ({ ...prev, [qid]: { id: qid, value: optionValue, score: (opt.score as 1|2) } }));
  };

  const handleExtraText = (qid: string, text: string) => {
    const existing = answers[qid];
    if (!existing) return;
    setAnswers(prev => ({ ...prev, [qid]: { ...existing, extraText: text } }));
  };

  const canContinueQuestions = useMemo(() => {
    return QUESTIONS.every(q => !!answers[q.id]);
  }, [answers]);

  const canContinueData = useMemo(() => {
    return (
      form.name.trim().length > 1 &&
      form.company.trim().length > 1 &&
      /.+@.+\..+/.test(form.email) &&
      isCorporateEmail(form.email)
    );
  }, [form]);

  const onSubmit = async () => {
    if (!form.consent) {
      setError("Debes aceptar el consentimiento para continuar."); // 🚀 en vez de alert
      return;
    }
    setLoading(true);
    setServerResp(null);
    setError(null);

    try {
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: Object.values(answers),
          contact: form,
          utms,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error al enviar");
      setServerResp({ ok: true, message: data.message, title: data.title, resultKey: data.resultKey });
    } catch (e: any) {
      setServerResp({ ok: false, message: e.message || "Error", title: "Error", resultKey: "nocupo" });
    } finally {
      setLoading(false);
    }
  };

  if (serverResp?.ok) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="w-full h-2 bg-gray-200 rounded mb-6">
          <div className="h-2 bg-blue-500 rounded" style={{ width: "100%" }} />
        </div>
        <h1 className="text-2xl font-semibold mb-2">{serverResp.title}</h1>
        <p className="text-gray-700 mb-6">{serverResp.message}</p>
        {serverResp.resultKey === "califica" ? (
          <a href="https://wa.me/50242170962?text=Hola%2C%20vengo%20del%20diagn%C3%B3stico" className="inline-block px-5 py-3 rounded-2xl shadow bg-blue-600 text-white">Ir a WhatsApp</a>
        ) : null}
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* Barra de progreso */}
      <div className="w-full h-2 bg-gray-200 rounded mb-6">
        <div className="h-2 bg-blue-500 rounded transition-all" style={{ width: `${progressPct}%` }} />
      </div>

      <h1 className="text-2xl font-semibold mb-4">Diagnóstico para Radiografía de Software de Gestión Empresarial</h1>
      <p className="text-gray-600 mb-8">Completa el cuestionario y conoce tu resultado al instante.</p>

      {error && <p className="mb-4 text-red-600 font-medium">{error}</p>} {/* 🚀 mensaje de error */}

      {/* Paso 1 */}
      {step === 1 && (
        <section className="space-y-6">
          {/* ... resto igual ... */}
        </section>
      )}

      {/* Paso 2 */}
      {step === 2 && (
        <section className="space-y-4">
          {/* ... resto igual ... */}
        </section>
      )}

      {/* Paso 3 */}
      {step === 3 && (
        <section className="space-y-4">
          {/* ... resto igual ... */}
        </section>
      )}
    </main>
  );
}
