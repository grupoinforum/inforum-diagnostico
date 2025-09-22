// app/api/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

/* ========= Types ========= */
type Payload = {
  name: string;
  company?: string;
  email: string;
  country?: string;      // Label (ej. "Guatemala") para la nota (opcional)
  countryCode?: string;  // Código ISO que mandas del front: "GT" | "SV" | "HN" | "PA" | "DO" | "EC"
  answers?: any;         // { utms, items: [...] }
  score1Count?: number;
  qualifies?: boolean;
  resultText?: string;   // "Sí califica" | "No hay cupo (exhaustivo)"
};

type PDItem = { id: number };

/* ========= ENV Pipedrive ========= */
const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN!;       // ej: "inforum"
const PD_API    = process.env.PIPEDRIVE_API_KEY!;

const PD_DEFAULT_PIPELINE_ID = toNum(process.env.PD_DEFAULT_PIPELINE_ID);
const PD_DEFAULT_STAGE_ID    = toNum(process.env.PD_DEFAULT_STAGE_ID);

const PD_GT_PIPELINE_ID = toNum(process.env.PD_GT_PIPELINE_ID);
const PD_GT_STAGE_ID    = toNum(process.env.PD_GT_STAGE_ID);
const PD_SV_PIPELINE_ID = toNum(process.env.PD_SV_PIPELINE_ID);
const PD_SV_STAGE_ID    = toNum(process.env.PD_SV_STAGE_ID);
const PD_HN_PIPELINE_ID = toNum(process.env.PD_HN_PIPELINE_ID);
const PD_HN_STAGE_ID    = toNum(process.env.PD_HN_STAGE_ID);
const PD_PA_PIPELINE_ID = toNum(process.env.PD_PA_PIPELINE_ID);
const PD_PA_STAGE_ID    = toNum(process.env.PD_PA_STAGE_ID);
const PD_DO_PIPELINE_ID = toNum(process.env.PD_DO_PIPELINE_ID);
const PD_DO_STAGE_ID    = toNum(process.env.PD_DO_STAGE_ID);
const PD_EC_PIPELINE_ID = toNum(process.env.PD_EC_PIPELINE_ID);
const PD_EC_STAGE_ID    = toNum(process.env.PD_EC_STAGE_ID);

/* ========= SMTP ========= */
const BREVO_USER = process.env.BREVO_SMTP_USER!;
const BREVO_PASS = process.env.BREVO_SMTP_PASS!;
const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";

/* ========= Sitio & Video ========= */
const SITE_URL    = "https://grupoinforum.com";
const VIDEO_ID    = "Eau96xNp3Ds";
const VIDEO_URL   = `https://youtu.be/${VIDEO_ID}`;
const VIDEO_IMAGE = "https://inforum-diagnostico.vercel.app/video.png";

/* ========= Utils ========= */
function toNum(v: any): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}
function pdUrl(path: string) {
  return `https://${PD_DOMAIN}.pipedrive.com/v1${path}?api_token=${PD_API}`;
}
async function pdJson(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

/** Elige pipeline/stage por código de país (GT, SV, HN, PA, DO, EC).
 *  Si no matchea o no hay envs, usa el DEFAULT. */
function pickByCode(code?: string) {
  const cc = (code || "").trim().toUpperCase();
  switch (cc) {
    case "GT": return { pipeline_id: PD_GT_PIPELINE_ID, stage_id: PD_GT_STAGE_ID };
    case "SV": return { pipeline_id: PD_SV_PIPELINE_ID, stage_id: PD_SV_STAGE_ID };
    case "HN": return { pipeline_id: PD_HN_PIPELINE_ID, stage_id: PD_HN_STAGE_ID };
    case "PA": return { pipeline_id: PD_PA_PIPELINE_ID, stage_id: PD_PA_STAGE_ID };
    case "DO": return { pipeline_id: PD_DO_PIPELINE_ID, stage_id: PD_DO_STAGE_ID };
    case "EC": return { pipeline_id: PD_EC_PIPELINE_ID, stage_id: PD_EC_STAGE_ID };
    default:   return { pipeline_id: PD_DEFAULT_PIPELINE_ID, stage_id: PD_DEFAULT_STAGE_ID };
  }
}

/** Respaldo por label (para envíos viejos sin countryCode) */
function pickByLabel(label?: string) {
  const s = (label || "").toLowerCase();
  if (s.includes("guatemala")) return pickByCode("GT");
  if (s.includes("salvador"))  return pickByCode("SV");
  if (s.includes("honduras"))  return pickByCode("HN");
  if (s.includes("panam"))     return pickByCode("PA"); // panamá/panama
  if (s.includes("dominican")) return pickByCode("DO");
  if (s.includes("dominicana"))return pickByCode("DO");
  if (s.includes("ecuador"))   return pickByCode("EC");
  return pickByCode(undefined);
}

function pickPipelineStage(countryCode?: string, countryLabel?: string) {
  return countryCode ? pickByCode(countryCode) : pickByLabel(countryLabel);
}

/* ========= Pipedrive: upsert Persona por email ========= */
async function upsertPersonByEmail(name: string, email: string): Promise<PDItem | undefined> {
  if (!email) return;
  const search = await fetch(
    pdUrl(`/persons/search`) + `&term=${encodeURIComponent(email)}&fields=email&exact_match=true`,
    { method: "GET" }
  );
  const sJson = await pdJson(search);
  const found = sJson?.data?.items?.[0]?.item;
  if (search.ok && found?.id) return { id: found.id };

  const res = await fetch(pdUrl(`/persons`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: name || email,
      email: [{ value: email, primary: true, label: "work" }],
    }),
  });
  const j = await pdJson(res);
  if (!res.ok || !j?.data?.id) {
    throw new Error(`Pipedrive person create error: ${res.status} ${JSON.stringify(j)}`);
  }
  return { id: j.data.id };
}

/* ========= Pipedrive: upsert Organización por nombre ========= */
async function upsertOrganizationByName(name?: string): Promise<PDItem | undefined> {
  if (!name) return;
  const search = await fetch(
    pdUrl(`/organizations/search`) + `&term=${encodeURIComponent(name)}&exact_match=true`,
    { method: "GET" }
  );
  const sJson = await pdJson(search);
  const found = sJson?.data?.items?.[0]?.item;
  if (search.ok && found?.id) return { id: found.id };

  const res = await fetch(pdUrl(`/organizations`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const j = await pdJson(res);
  if (!res.ok || !j?.data?.id) {
    throw new Error(`Pipedrive org create error: ${res.status} ${JSON.stringify(j)}`);
  }
  return { id: j.data.id };
}

/* ========= Pipedrive: crear Deal ========= */
async function createDeal(data: Payload, person?: PDItem, org?: PDItem): Promise<PDItem> {
  const { pipeline_id, stage_id } = pickPipelineStage(data.countryCode, data.country);

  const body: any = {
    title: `[Diagnóstico] ${data.name}${data.company ? ` – ${data.company}` : ""}`,
    visible_to: 3, // Entire company
  };
  if (person?.id) body.person_id = person.id;
  if (org?.id) body.org_id = org.id;
  if (pipeline_id) body.pipeline_id = pipeline_id;
  if (stage_id) body.stage_id = stage_id;

  const res = await fetch(pdUrl(`/deals`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const j = await pdJson(res);
  if (!res.ok || !j?.data?.id) {
    throw new Error(`Pipedrive deal create error: ${res.status} ${JSON.stringify(j)}`);
  }
  return { id: j.data.id };
}

/* ========= Pipedrive: nota en Deal ========= */
async function createNoteForDeal(dealId: number, data: Payload) {
  const utms = data?.answers?.utms ? JSON.stringify(data.answers.utms) : "";
  const respuestas = data?.answers?.items ? JSON.stringify(data.answers.items, null, 2) : "";

  const content =
`Deal generado por Diagnóstico
Nombre: ${data.name}
Empresa: ${data.company || "-"}
Email: ${data.email}
País: ${data.country || "-"} (${(data.countryCode || "").toUpperCase() || "-"})
Resultado: ${data.resultText || "-"}
Qualifies: ${data.qualifies ? "Sí" : "No"}
Score1Count: ${data.score1Count ?? "-"}

UTMs: ${utms}

Respuestas:
${respuestas}`.trim();

  const res = await fetch(pdUrl(`/notes`), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content, deal_id: dealId }),
  });
  const j = await pdJson(res);
  if (!res.ok) throw new Error(`Pipedrive note create error: ${res.status} ${JSON.stringify(j)}`);
}

/* ========= Email ========= */
function buildEmail(data: Payload) {
  const qualifies = !!data.qualifies;

  const subject = qualifies
    ? "Tu diagnóstico califica – Grupo Inforum"
    : "Gracias por tu diagnóstico – Grupo Inforum";

  const leadText = qualifies
    ? "¡Felicidades! Estás a 1 paso de obtener tu asesoría sin costo. Rita Muralles se estará comunicando contigo para agendar una sesión corta de 30 minutos para presentarnos y realizar unas últimas dudas para guiarte de mejor manera."
    : "¡Gracias por llenar el cuestionario! Por el momento nuestro equipo se encuentra con cupo lleno. Te estaremos contactando al liberar espacio. Por lo pronto te invitamos a conocer más de nosotros.";

  const text = `${leadText}

Ver video: ${VIDEO_URL}

Website: ${SITE_URL}`.trim();

  const html = `
<div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;line-height:1.55;color:#111">
  <p style="margin:0 0 14px">${leadText}</p>

  <a href="${VIDEO_URL}" target="_blank" rel="noopener"
     style="text-decoration:none;border:0;display:inline-block;margin:6px 0 18px">
    <img src="${VIDEO_IMAGE}" width="560" alt="Ver video"
         style="display:block;max-width:100%;height:auto;border:0;border-radius:12px" />
  </a>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0">
    <tr>
      <td bgcolor="#082a49" style="border-radius:10px">
        <a href="${SITE_URL}" target="_blank" rel="noopener"
           style="font-size:16px;line-height:16px;font-weight:600;color:#ffffff;text-decoration:none;padding:12px 18px;display:inline-block">
          Visita nuestro website
        </a>
      </td>
    </tr>
  </table>
</div>
`.trim();

  return { subject, text, html };
}

/* ========= Handler ========= */
export async function POST(req: Request) {
  try {
    if (!PD_DOMAIN || !PD_API) {
      throw new Error("Faltan PIPEDRIVE_DOMAIN o PIPEDRIVE_API_KEY.");
    }
    const data = (await req.json()) as Payload;

    if (!data?.name || !data?.email) {
      return NextResponse.json(
        { ok: false, error: "Faltan nombre o email" },
        { status: 400 }
      );
    }

    // 1) Upsert persona y organización
    const [person, org] = await Promise.all([
      upsertPersonByEmail(data.name, data.email),
      upsertOrganizationByName(data.company),
    ]);

    // 2) Crear Deal (por código de país si viene; si no, por label)
    const deal = await createDeal(data, person, org);

    // 3) Nota con todo el detalle del diagnóstico
    await createNoteForDeal(deal.id, data);

    // 4) Email al usuario
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: { user: BREVO_USER, pass: BREVO_PASS },
    });
    const { subject, text, html } = buildEmail(data);
    await transporter.sendMail({ from: EMAIL_FROM, to: data.email, subject, text, html });

    return NextResponse.json({
      ok: true,
      message: "Deal creado por país + persona/organización enlazadas + nota + correo enviado",
      dealId: deal.id,
    });
  } catch (err: any) {
    console.error("Error en /api/submit:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
