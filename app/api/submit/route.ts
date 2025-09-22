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
  country?: string;         // "Guatemala", "El Salvador", etc.
  answers?: any;            // { utms, items: [...] }
  score1Count?: number;
  qualifies?: boolean;
  resultText?: string;      // "Sí califica" | "No hay cupo (exhaustivo)"
};

/* ========= ENV ========= */
const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN!;
const PD_API = process.env.PIPEDRIVE_API_KEY!;
const BREVO_USER = process.env.BREVO_SMTP_USER!;
const BREVO_PASS = process.env.BREVO_SMTP_PASS!;
const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";

/* ========= Sitio & Video ========= */
const SITE_URL = "https://grupoinforum.com";
const VIDEO_ID = "Eau96xNp3Ds";
const VIDEO_URL = `https://youtu.be/${VIDEO_ID}`;
const VIDEO_IMAGE = "https://inforum-diagnostico.vercel.app/video.png";

/* ========= Helpers ========= */
function normCountry(c?: string) {
  if (!c) return "";
  const s = c.trim().toLowerCase();
  if (s.includes("guatemala")) return "GT";
  if (s.includes("salvador")) return "SV";
  if (s.includes("honduras")) return "HN";
  if (s.includes("panamá") || s.includes("panama")) return "PA";
  if (s.includes("dominican")) return "DO";
  if (s.includes("ecuador")) return "EC";
  return "";
}

function getPipelineStageByCountry(country?: string) {
  const cc = normCountry(country);
  // Fallback global
  const fallback = {
    pipeline_id: Number(process.env.PD_DEFAULT_PIPELINE_ID || 0) || undefined,
    stage_id: Number(process.env.PD_DEFAULT_STAGE_ID || 0) || undefined,
  };

  const table: Record<string, { pipeline_id?: number; stage_id?: number }> = {
    GT: {
      pipeline_id: Number(process.env.PD_GT_PIPELINE_ID || 0) || undefined,
      stage_id: Number(process.env.PD_GT_STAGE_ID || 0) || undefined,
    },
    SV: {
      pipeline_id: Number(process.env.PD_SV_PIPELINE_ID || 0) || undefined,
      stage_id: Number(process.env.PD_SV_STAGE_ID || 0) || undefined,
    },
    HN: {
      pipeline_id: Number(process.env.PD_HN_PIPELINE_ID || 0) || undefined,
      stage_id: Number(process.env.PD_HN_STAGE_ID || 0) || undefined,
    },
    PA: {
      pipeline_id: Number(process.env.PD_PA_PIPELINE_ID || 0) || undefined,
      stage_id: Number(process.env.PD_PA_STAGE_ID || 0) || undefined,
    },
    DO: {
      pipeline_id: Number(process.env.PD_DO_PIPELINE_ID || 0) || undefined,
      stage_id: Number(process.env.PD_DO_STAGE_ID || 0) || undefined,
    },
    EC: {
      pipeline_id: Number(process.env.PD_EC_PIPELINE_ID || 0) || undefined,
      stage_id: Number(process.env.PD_EC_STAGE_ID || 0) || undefined,
    },
  };

  const pick = table[cc];
  return (pick && (pick.pipeline_id || pick.stage_id)) ? pick : fallback;
}

/* ========= Pipedrive: Create Deal ========= */
async function pdCreateDeal(data: Payload) {
  if (!PD_DOMAIN || !PD_API) {
    throw new Error("Config Pipedrive incompleta (PIPEDRIVE_DOMAIN/API_KEY).");
  }
  const url = `https://${PD_DOMAIN}.pipedrive.com/v1/deals?api_token=${PD_API}`;

  const { pipeline_id, stage_id } = getPipelineStageByCountry(data.country);

  const body: any = {
    title: `[Diagnóstico] ${data.name}${data.company ? ` – ${data.company}` : ""}`,
    visible_to: 3, // Entire company
  };
  if (pipeline_id) body.pipeline_id = pipeline_id;
  if (stage_id) body.stage_id = stage_id;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data?.id) {
    throw new Error(`Pipedrive create deal error: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.data as { id: number };
}

/* ========= Pipedrive: Create Note for Deal ========= */
async function pdCreateNoteForDeal(dealId: number, data: Payload) {
  const url = `https://${PD_DOMAIN}.pipedrive.com/v1/notes?api_token=${PD_API}`;

  const utms = data?.answers?.utms ? JSON.stringify(data.answers.utms) : "";
  const respuestas = data?.answers?.items ? JSON.stringify(data.answers.items, null, 2) : "";

  const content =
`Deal generado por Diagnóstico
Nombre: ${data.name}
Empresa: ${data.company || "-"}
Email: ${data.email}
País: ${data.country || "-"}
Resultado: ${data.resultText || "-"}
Qualifies: ${data.qualifies ? "Sí" : "No"}
Score1Count: ${data.score1Count ?? "-"}

UTMs: ${utms}

Respuestas:
${respuestas}`.trim();

  const body = { content, deal_id: dealId };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Pipedrive create note error: ${res.status} ${JSON.stringify(json)}`);
  }
  return json.data;
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
    const data = (await req.json()) as Payload;

    if (!data?.name || !data?.email) {
      return NextResponse.json(
        { ok: false, error: "Faltan nombre o email" },
        { status: 400 }
      );
    }

    // 1) Crear DEAL (por país) en Pipedrive
    const deal = await pdCreateDeal(data);

    // 2) Nota en el deal con todo el detalle del diagnóstico
    await pdCreateNoteForDeal(deal.id, data);

    // 3) Enviar correo al usuario
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: { user: BREVO_USER, pass: BREVO_PASS },
    });

    const { subject, text, html } = buildEmail(data);
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: data.email,
      subject,
      text,
      html,
    });

    return NextResponse.json({
      ok: true,
      message: "Deal creado por país + nota + correo enviado",
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
