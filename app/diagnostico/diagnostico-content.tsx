// app/diagnostico/diagnostico-content.tsx
"use client";
import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

/* =========================
   CONFIGURACIÓN DEL TEST (7)
   ========================= */
const QUESTIONS = [
  {
    id: "industria",
    label: "¿En qué industria opera la compañía?",
    type: "single" as const,
    options: [
      { value: "produccion", label: "Producción", score: 2 },
      { value: "distribucion", label: "Distribución", score: 2 },
      { value: "retail", label: "Retail", score: 2 },
      { value: "servicios", label: "Servicios", score: 2 },
      { value: "otro", label: "Otro (especificar)", score: 1, requiresText: true },
    ],
    required: true,
  },
  {
    id: "erp",
    label: "¿Qué sistema empresarial (ERP) utiliza actualmente su empresa?",
    type: "single" as const,
    options: [
      { value: "sapb1", label: "SAP Business One", score: 2 },
      { value: "odoo", label: "Odoo", score: 2 },
      { value: "oracle", label: "Oracle", score: 2 },
      { value: "msdynamics", label: "Microsoft Dynamics", score: 2 },
      { value: "sistema_propio", label: "Sistema Propio", score: 2 },
      { value: "erp_otro", label: "Otro (especificar)", score: 2, requiresText: true },
    ],
    required: true,
  },
  {
    id: "personas",
    label: "¿Cuántas personas dependen del sistema para su trabajo diario?",
    type: "single" as const,
    options: [
      { value: ">20", label: "+20 personas", score: 2 },
      { value: "<=20", label: "-20 personas", score: 1 },
    ],
    required: true,
  },
  {
    id: "paises",
    label: "¿La compañía opera en 1 o varios países?",
    type: "single" as const,
    options: [
      { value: "1", label: "1 país", score: 1 },
      { value: ">1", label: "Varios países", score: 2 },
    ],
    required: true,
  },
  {
    id: "lineas",
    label: "¿Cuántas líneas de negocio tiene la compañía?",
    type: "single" as const,
    options: [
      { value: "1", label: "1 línea de negocio", score: 1 },
      { value: ">1", label: "Múltiples líneas de negocio", score: 2 },
    ],
    required: true,
  },
  {
    id: "satisfaccion",
    label: "¿Nivel de satisfacción con el sistema actual?",
    type: "single" as const,
    options: [
      { value: "1-3", label: "1-3 (insatisfecho)", score: 2 },
      { value: "4-6", label: "4-6 (puede mejorar)", score: 2 },
      { value: "7-10", label: "7-10 (cumple)", score: 1 },
    ],
    required: true,
  },
  {
    id: "pro_tecnologia",
    label: "¿La empresa es pro-tecnología?",
    type: "single" as const,
    options: [
      { value: "si", label: "Sí", score: 2 },
      { value: "no", label: "No", score: 1 },
    ],
    required: true,
  },
] as const;

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

const FREE_EMAIL_DOMAINS = [
  "gmail.com","hotmail.com","outlook.com","yahoo.com","icloud.com","proton.me","aol.com","live.com","msn.com"
];

function isCorporateEmail(email: string) {
  const domain = email.split("@").pop()?.toLowerCase().trim();
  if (!domain) return false;
  return !FREE_EMAIL_DOMAINS.includes(domain);
}

/* =========================
   TEXTOS DE RESULTADO
   ========================= */
const SUCCESS_TEXT = `¡Felicidades! Estás a 1 paso de obtener tu asesoría sin costo.
Rita Muralles se estará comunicando contigo para agendar una sesión corta de 30 minutos para presentarnos y realizar unas últimas dudas para guiarte de mejor manera.
Acabamos de enviarte un correo con esta información.`;

const FULL_TEXT = `¡Gracias por llenar el cuestionario! Por el momento nuestro equipo se encuentra con cupo lleno.
Acabamos de enviarte un correo a tu bandeja de entrada para compartirte más información sobre nosotros.
Te estaremos contactando al liberar espacio.`;

/* =========================
   EVALUACIÓN
   ========================= */
function evaluateScore1(finalAnswers: Answer[]) {
  const score1Count = finalAnswers.filter(a => a.score === 1).length;
  const qualifies = score1Count <= 3;
  const resultText = qualifies ? "Sí califica" : "No hay cupo (exhaustivo)";
  const uiText = qualifies ? SUCCESS_TEXT : FULL_TEXT;
  return { score1Count, qualifies, resultText, uiText };
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
  if (!res.ok) throw new Error(json?.error || `Error ${res.status}`);
  return json;
}

/* =========================
   COMPONENTE
   ========================= */
export default function DiagnosticoContent() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [answers, setAnswers] = useState<Record<string, Answer | undefined>>({});
  const [form, setForm] = useState<{
    name: string; company: string; email: string; country: CountryValue; consent: boolean;
  }>({ name: "", company: "", email: "", country: "GT", consent: false });
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

  const canContinueQuestions = useMemo(() => QUESTIONS.every(q => !!answers[q.id]), [answers]);

  const canContinueData = useMemo(
    () => form.name.trim().length > 1 && form.company.trim().length > 1 && /.+@.+\..+/.test(form.email) && isCorporateEmail(form.email),
    [form]
  );

  const onSubmit = async () => {
    setErrorMsg(null);
    if (!form.consent) { setErrorMsg("Debes aceptar el consentimiento para continuar."); return; }
    setLoading(true);

    try {
      const finalAnswers = Object.values(answers).filter(Boolean) as Answer[];
      const { score1Count, qualifies, resultText, uiText } = evaluateScore1(finalAnswers);
      const countryLabel = COUNTRIES.find(c => c.value === form.country)?.label || form.country;

      await submitDiagnostico({
        name: form.name,
        company: form.company,
        email: form.email,
        country: countryLabel,
        answers: { utms, items: finalAnswers },
        score1Count,
        qualifies,
        resultText,
      });

      setResultUI({
        qualifies,
        title: resultText,
        message: uiText,
      });
    } catch (e: any) {
      setErrorMsg(e?.message || "No se logró enviar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  if (resultUI) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="w-full h-2 bg-gray-200 rounded mb-6">
          <div className="h-2 bg-blue-500 rounded" style={{ width: "100%" }} />
        </div>
        <h1 className="text-2xl font-semibold mb-3">{resultUI.title}</h1>
        <p className="whitespace-pre-line text-gray-800 leading-relaxed">{resultUI.message}</p>

        {/* ÚNICO CTA */}
        <a
          href="https://www.grupoinforum.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-4 px-5 py-3 rounded-2xl bg-[#082a49] text-white"
        >
          Visita nuestro website
        </a>

        {resultUI.qualifies && (
          <a
            href="https://wa.me/50242170962?text=Hola%2C%20vengo%20del%20diagn%C3%B3stico"
            className="inline-block mt-3 px-5 py-3 rounded-2xl shadow bg-blue-600 text-white"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ir a WhatsApp
          </a>
        )}
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
      <p classNam
