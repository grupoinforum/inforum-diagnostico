
import type { NextRequest } from "next/server";

export const runtime = "nodejs"; // ejecución en Node.js

// --- Utilidades ---
const FREE_EMAIL_DOMAINS = [
  "gmail.com", "hotmail.com", "outlook.com", "yahoo.com", "icloud.com", "proton.me", "aol.com", "live.com", "msn.com"
];
function isCorporateEmail(email: string) {
  const domain = email.split("@").pop()?.toLowerCase().trim();
  return !!domain && !FREE_EMAIL_DOMAINS.includes(domain);
}

// Rate limit simple (en memoria por instancia)
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hora
const RATE_MAX = 5; // 5 envíos por IP por hora
const ipHits = new Map<string, { count: number; resetAt: number }>();

function checkRate(ip: string) {
  const now = Date.now();
  const rec = ipHits.get(ip);
  if (!rec || now > rec.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (rec.count >= RATE_MAX) return false;
  rec.count += 1; ipHits.set(ip, rec); return true;
}

// Pipedrive config
const PIPEDRIVE_API_TOKEN = process.env.PIPEDRIVE_API_TOKEN!; // setear en Vercel
const PIPEDRIVE_BASE = "https://api.pipedrive.com/v1";

// Brevo config
const BREVO_API_KEY = process.env.BREVO_API_KEY!; // setear en Vercel
const EMAIL_FROM = process.env.EMAIL_FROM!; // ej. info@inforumsol.com
const EMAIL_BCC = process.env.EMAIL_BCC || ""; // opcional

// reCAPTCHA (opcional: si no hay secret, se omite)
const RECAPTCHA_SECRET = process.env.RECAPTCHA_SECRET || "";

// Custom fields de Pipedrive (Deal)
const CF_INDUSTRIA = process.env.PD_CF_INDUSTRIA || "";
const CF_SISTEMA = process.env.PD_CF_SISTEMA || "";

// Pipeline IDs por país
const PIPELINES: Record<string, number> = {
  GT: 1, // Guatemala
  SV: 2, // El Salvador
  HN: 3, // Honduras
  DO: 4, // República Dominicana
  EC: 5, // Ecuador
  PA: 6, // Panamá
};

// --- Helpers Pipedrive ---
async function pd(path: string, init?: RequestInit) {
  const url = `${PIPEDRIVE_BASE}${path}${path.includes("?") ? "&" : "?"}api_token=${PIPEDRIVE_API_TOKEN}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || (json && json.success === false)) {
    throw new Error(json?.error || json?.message || `Pipedrive error (${res.status})`);
  }
  return json;
}

async function createOrganization(name: string, extras: Record<string, any>) {
  return pd("/organizations", { method: "POST", body: JSON.stringify({ name, ...extras }) });
}

async function createPerson(name: string, email: string, org_id?: number) {
  return pd("/persons", { method: "POST", body: JSON.stringify({ name, email, org_id }) });
}

async function createDeal(data: Record<string, any>) {
  return pd("/deals", { method: "POST", body: JSON.stringify(data) });
}

async function addNote(deal_id: number, content: string) {
  return pd("/notes", { method: "POST", body: JSON.stringify({ deal_id, content }) });
}

// --- Brevo ---
async function sendBrevoEmail({ to, subject, html, bcc = EMAIL_BCC }: { to: string; subject: string; html: string; bcc?: string }) {
  const payload: any = {
    sender: { email: EMAIL_FROM },
    to: [{ email: to }],
    subject,
    htmlContent: html
  };
  if (bcc) payload.bcc = [{ email: bcc }];

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Brevo error: ${res.status} ${t}`);
  }
}

function buildEmailTemplates(resultKey: "califica" | "nocupo", name: string) {
  if (resultKey === "califica") {
    return {
      subject: "Tu diagnóstico: calificas para la asesoría sin costo",
      html: `
        <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif; font-size:16px; color:#111">
          <p>Hola ${name},</p>
          <p>¡Felicidades! De acuerdo con tu diagnóstico, <b>calificas</b> para nuestra asesoría sin costo.</p>
          <p>Un especialista te contactará en breve. Si prefieres, puedes escribirnos ahora mismo por WhatsApp:</p>
          <p><a href="https://wa.me/50242170962?text=Hola%2C%20vengo%20del%20diagn%C3%B3stico">Ir a WhatsApp</a></p>
          <p>— Equipo Grupo Inforum</p>
        </div>`
    };
  }
  return {
    subject: "Tu diagnóstico: por ahora sin cupo",
    html: `
      <div style="font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif; font-size:16px; color:#111">
        <p>Hola ${name},</p>
        <p>Gracias por completar el diagnóstico. Por el momento nos encontramos sin cupo para la asesoría sin costo.</p>
        <p>Te enviaremos información útil sobre nuestros servicios y quedamos atentos a apoyarte cuando se habiliten nuevos cupos.</p>
        <p>— Equipo Grupo Inforum</p>
      </div>`
  };
}

function decideResult(answers: { score: 1 | 2 }[]): { resultKey: "califica" | "nocupo"; title: string; message: string } {
  const countOnes = answers.reduce((acc,a)=> acc + (a.score === 1 ? 1 : 0), 0);
  // Regla: <=3 ⇒ califica, >=4 ⇒ no hay cupo
  if (countOnes <= 3) {
    return {
      resultKey: "califica",
      title: "¡Felicidades! Calificas para una asesoría sin costo.",
      message: "Te hemos enviado un correo con los siguientes pasos para agendar una primera sesión.",
    };
  }
  return {
    resultKey: "nocupo",
    title: "Lo sentimos, por ahora sin cupo",
    message: "Por el momento nos encontramos sin cupo para la asesoría. Te hemos enviado información a tu correo.",
  };
}

export async function POST(req: NextRequest) {
  try {
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0] || "unknown";
    if (!checkRate(ip)) {
      return new Response(JSON.stringify({ message: "Demasiados intentos. Intenta más tarde." }), { status: 429 });
    }

    const body = await req.json();
    const { answers, contact, utms, recaptchaToken } = body as {
      answers: { id: string; value: string; score: 1 | 2; extraText?: string }[];
      contact: { name: string; company: string; email: string; country: keyof typeof PIPELINES; consent: boolean };
      utms?: Record<string,string>;
      recaptchaToken?: string;
    };

    if (!answers || answers.length !== 7) throw new Error("Respuestas inválidas");
    if (!contact?.name || !contact?.company || !contact?.email || !contact?.country) throw new Error("Datos de contacto incompletos");
    if (!isCorporateEmail(contact.email)) throw new Error("Usa un correo corporativo (no gratuito)");

    // reCAPTCHA opcional
    if (RECAPTCHA_SECRET && recaptchaToken) {
      const v = await fetch("https://www.google.com/recaptcha/api/siteverify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ secret: RECAPTCHA_SECRET, response: recaptchaToken })
      });
      const vjson = await v.json();
      if (!vjson.success || (typeof vjson.score === "number" && vjson.score < 0.7)) {
        return new Response(JSON.stringify({ message: "No pudimos verificar que seas humano." }), { status: 400 });
      }
    }

    // Determinar resultado
    const decision = decideResult(answers);

    // Crear en Pipedrive: Organization → Person → Deal
    const orgName = contact.company;
    const org = await createOrganization(orgName, {
      ...(CF_INDUSTRIA ? { [CF_INDUSTRIA]: answers.find(a => a.id === "industria")?.value || "" } : {}),
    });
    const orgId = org?.data?.id as number | undefined;

    const person = await createPerson(contact.name, contact.email, orgId);
    const personId = person?.data?.id as number | undefined;

    const pipeline_id = PIPELINES[contact.country] || 1;

    const dealTitle = `Diagnóstico — ${orgName}`;
    const dealPayload: Record<string, any> = {
      title: dealTitle,
      pipeline_id,
      person_id: personId,
      org_id: orgId,
      value: 0,
      currency: "USD",
      ...(CF_INDUSTRIA ? { [CF_INDUSTRIA]: answers.find(a => a.id === "industria")?.value || "" } : {}),
      ...(CF_SISTEMA ? { [CF_SISTEMA]: answers.find(a => a.id === "erp")?.value || "" } : {}),
    };

    const deal = await createDeal(dealPayload);
    const dealId = deal?.data?.id as number;

    // Nota con UTMs y respuestas
    const noteLines: string[] = [];
    noteLines.push(`Resultado: ${decision.resultKey}`);
    if (utms && Object.keys(utms).length) {
      noteLines.push("UTMs:");
      for (const [k,v] of Object.entries(utms)) noteLines.push(`- ${k}: ${v}`);
    }
    noteLines.push("Respuestas:");
    answers.forEach(a => noteLines.push(`- ${a.id}: ${a.value}${a.extraText ? ` (${a.extraText})` : ""} [score ${a.score}]`));
    await addNote(dealId, noteLines.join("\n"));

    // Enviar email transaccional
    const emailTpl = buildEmailTemplates(decision.resultKey, contact.name);
    await sendBrevoEmail({ to: contact.email, subject: emailTpl.subject, html: emailTpl.html });

    return new Response(JSON.stringify({
      ok: true,
      resultKey: decision.resultKey,
      title: decision.title,
      message: decision.message,
      dealId
    }), { status: 200 });
  } catch (err: any) {
    return new Response(JSON.stringify({ message: err.message || "Error" }), { status: 400 });
  }
}
