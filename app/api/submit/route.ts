// app/api/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

/* ========= TYPES ========= */
type Payload = {
  name: string;
  company?: string;
  email: string;
  country?: string;         // etiqueta país (ej. "Guatemala")
  answers?: any;            // { utms, items: [...] }
  score1Count?: number;
  qualifies?: boolean;
  resultText?: string;      // "Sí califica" | "No hay cupo (exhaustivo)"
};

/* ========= ENV VARS (requeridas) ========= */
const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN!;
const PD_API = process.env.PIPEDRIVE_API_KEY!;
const BREVO_USER = process.env.BREVO_SMTP_USER!;
const BREVO_PASS = process.env.BREVO_SMTP_PASS!;
const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";

/* ========= SITIO & VIDEO ========= */
const SITE_URL = "https://grupoinforum.com";
const VIDEO_ID = "Eau96xNp3Ds";
const VIDEO_URL = `https://youtu.be/${VIDEO_ID}`;
const VIDEO_IMAGE = "https://inforum-diagnostico.vercel.app/video.png";

/* ========= Helpers ========= */
function requireEnv(name: string, val?: string) {
  if (!val) throw new Error(`Falta env var: ${name}`);
}

/* ========= PIPEDRIVE: crear lead ========= */
async function pdCreateLead(data: Payload) {
  requireEnv("PIPEDRIVE_DOMAIN", PD_DOMAIN);
  requireEnv("PIPEDRIVE_API_KEY", PD_API);

  const url = `https://${PD_DOMAIN}.pipedrive.com/v1/leads?api_token=${PD_API}`;

  const body = {
    title: `[Diagnóstico] ${data.name}${data.company ? ` – ${data.company}` : ""}`,
    visible_to: 3, // 3 = entire company
    // NADA de 'note' aquí (deprecado)
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json?.data?.id) {
    throw new Error(
      `Pipedrive create lead error: ${res.status} ${JSON.stringify(json)}`
    );
  }
  return json.data; // { id, title, ... }
}

/* ========= PIPEDRIVE: crear nota ligada al lead ========= */
async function pdCreateNoteForLead(leadId: number, data: Payload) {
  const url = `https://${PD_DOMAIN}.pipedrive.com/v1/notes?api_token=${PD_API}`;

  const utms = data?.answers?.utms ? JSON.stringify(data.answers.utms) : "";
  const respuestas = data?.answers?.items ? JSON.stringify(data.answers.items, null, 2) : "";

  const content =
`Lead generado por Diagnóstico
Nombre: ${data.name}
Empresa: ${data.company || "-"}
Email: ${data.email}
País: ${data.country || "-"}
Resultado: ${data.resultText || "-"}
Qualifies: ${data.qualifies ? "Sí" : "No"}
Score1Count: ${data.score1Count ?? "-"}

UTMs: ${utms}

Respuestas:
${respuestas}
`.trim();

  const body = {
    content,
    lead_id: leadId, // campo correcto para ligar la nota al lead
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `Pipedrive create note error: ${res.status} ${JSON.stringify(json)}`
    );
  }
  return json.data;
}

/* ========= EMAIL ========= */
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

/* ========= API ========= */
export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;
    if (!data?.name || !data?.email) {
      return NextResponse.json(
        { ok: false, error: "Faltan nombre o email" },
        { status: 400 }
      );
    }

    // 1) Pipedrive: crear lead
    const lead = await pdCreateLead(data);

    // 2) Pipedrive: crear nota asociada
    await pdCreateNoteForLead(lead.id, data);

    // 3) Email al usuario
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
      message: "Lead + nota en Pipedrive y correo enviado",
      leadId: lead.id,
    });
  } catch (err: any) {
    console.error("Error en /api/submit:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
