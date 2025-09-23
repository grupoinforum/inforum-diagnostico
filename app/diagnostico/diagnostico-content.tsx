// app/diagnostico/diagnostico-content.tsx
"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

/* =========================
   PREGUNTAS (7)
   ========================= */
const QUESTIONS = [ /* … tus preguntas iguales … */ ] as const;

type Answer = { id: string; value: string; score: 1 | 2; extraText?: string };

const COUNTRIES = [
  { value: "GT", label: "Guatemala" },
  { value: "SV", label: "El Salvador" },
  { value: "HN", label: "Honduras" },
  { value: "PA", label: "Panamá" },
  { value: "DO", label: "República Dominicana" },
  { value: "EC", label: "Ecuador" },
] as const;

type CountryValue = typeof COUNTRIES[number]["value"];

const FREE_EMAIL_DOMAINS = ["gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com","proton.me","aol.com","live.com","msn.com"];
function isCorporateEmail(email: string) {
  const domain = email.split("@").pop()?.toLowerCase().trim();
  if (!domain) return false;
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

/* =========================
   EVALUACIÓN
   ========================= */
const SUCCESS_TEXT = `¡Felicidades! Estás a 1 paso de obtener tu asesoría sin costo. Rita Muralles se estará comunicando contigo para agendar una sesión corta de 30min para presentarnos y realizar unas últimas dudas para guiarte de mejor manera. Acabamos de enviarte un correo con esta información.`;
const FULL_TEXT = `¡Gracias por llenar el cuestionario! Por el momento nuestro equipo se encuentra con cupo lleno. Acabamos de enviar un correo a tu bandeja de entrada para compartirte más información sobre nosotros. Te estaremos contactando al liberar espacio.`;

function evaluate(finalAnswers: Answer[]) {
  const score1Count = finalAnswers.filter(a => a.score === 1).length;
  const qualifies = score1Count <= 3;
  const resultText = qualifies ? "Si califica" : "No hay cupo";
  const uiText = qualifies ? SUCCESS_TEXT : FULL_TEXT;
  return { qualifies, resultText, uiText };
}

/* =========================
   API HELPER
   ========================= */
async function submitDiagnostico(payload: any) {
  const res = await fetch("/api/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error || `Error ${res.status}`);
  return json;
}

/* =========================
   COMPONENTE
   ========================= */
export default function DiagnosticoContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, Answer | undefined>>({});
  const [form, setForm] = useState<{ name: string; company: string; email: string; country: CountryValue; consent: boolean; }>({ name: "", company: "", email: "", country: "GT", consent: false });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [resultUI, setResultUI] = useState<null | { qualifies: boolean; title: string; message: string }>(null);

  const utms = useMemo(() => {
    const keys = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"] as const;
    const x: Record<string,string> = {};
    keys.forEach(k => { const v = searchParams.get(k); if (v) x[k] = v; });
    return x;
  }, [searchParams]);

  const progressPct = useMemo(() => (step / 3) * 100, [step]);

  const onSubmit = async () => {
    setErrorMsg(null);
    if (!form.consent) { setErrorMsg("Debes aceptar el consentimiento para continuar."); return; }
    setLoading(true);
    try {
      const finalAnswers = Object.values(answers).filter(Boolean) as Answer[];
      const { qualifies, resultText, uiText } = evaluate(finalAnswers);
      const countryLabel = COUNTRIES.find(c => c.value === form.country)?.label || form.country;

      await submitDiagnostico({ name: form.name, company: form.company, email: form.email, country: countryLabel, answers: { utms, items: finalAnswers }, qualifies, resultText });
      setResultUI({ qualifies, title: resultText, message: uiText });
    } catch (e: any) {
      setErrorMsg(e?.message || "No se logró enviar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  /* =========================
     RESULTADO
     ========================= */
  if (resultUI) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="w-full h-2 bg-gray-200 rounded mb-6">
          <div className="h-2 bg-blue-500 rounded" style={{ width: "100%" }} />
        </div>
        <h1 className="text-2xl font-semibold mb-3">{resultUI.title}</h1>
        <p className="whitespace-pre-line text-gray-800 leading-relaxed">{resultUI.message}</p>

        {/* Botones responsivos */}
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:gap-4">
          <a
            href="https://www.grupoinforum.com"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto text-center px-5 py-3 rounded-2xl bg-[#082a49] text-white"
          >
            Visita nuestro website
          </a>
          {resultUI.qualifies && (
            <a
              href="https://wa.me/50242170962?text=Hola%2C%20vengo%20del%20diagn%C3%B3stico"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto text-center px-5 py-3 rounded-2xl bg-blue-600 text-white"
            >
              Ir a WhatsApp
            </a>
          )}
        </div>
      </main>
    );
  }

  /* =========================
     FORMULARIO
     ========================= */
  return (
    <main className="max-w-3xl mx-auto p-6">
      {/* Barra de progreso */}
      <div className="w-full h-2 bg-gray-200 rounded mb-6">
        <div className="h-2 bg-blue-500 rounded transition-all" style={{ width: `${progressPct}%` }} />
      </div>
      {/* … resto de pasos igual que antes … */}
    </main>
  );
}
