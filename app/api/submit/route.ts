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
  country?: string;   // etiqueta país
  answers?: any;      // respuestas del diagnóstico
  qualifies?: boolean;
  resultText?: string;
};

/* ========= ENV VARS ========= */
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

/* ========= FUNC: Crear lead en Pipedrive ========= */
async function createPipedriveLead(data: Payload) {
  const url = `https://${PD_DOMAIN}.pipedrive.com/v1/leads?api_token=${PD_API}`;

  const body = {
    title: `[Diagnóstico] ${data.name} – ${data.company || ""}`,
    person_id: null,
    organization_id: null,
    visible_to: 3, // visible para todos
    label_ids: [],

    // custom fields / notas
    note: `Email: ${data.email}\nEmpresa: ${data.company}\nPaís: ${data.country}\nResultado: ${data.resultText}\nQualifies: ${data.qualifies ? "Sí" : "No"}\n\nRespuestas:\n${JSON.stringify(data.answers, null, 2)}`
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pipedrive error: ${res.status} ${errText}`);
  }
  return res.json();
}

/* ========= FUNC: Email ========= */
function emailBodies(data: Payload) {
  const qualifies = !!data.qualifies;

  const subject = qualifies
    ? "Tu diagnóstico califica – Grupo Inforum"
    : "Gracias por tu diagnóstico – Grupo Inforum";

  const lead = qualifies
    ? "¡Felicidades! Estás a 1 paso de obtener tu asesoría sin costo. Rita Muralles se estará comunicando contigo para agendar una sesión corta de 30 minutos para presentarnos y realizar unas últimas dudas para guiarte de mejor manera."
    : "¡Gracias por llenar el cuestionario! Por el momento nuestro equipo se encuentra con cupo lleno. Te estaremos contactando al liberar espacio. Por lo pronto te invitamos a conocer más de nosotros.";

  const text = `${lead}

Ver video: ${VIDEO_URL}

Website: ${SITE_URL}`.trim();

  const html = `
<div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;line-height:1.55;color:#111">
  <p style="margin:0 0 14px">${lead}</p>

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
      return NextResponse.json({ ok: false, error: "Faltan nombre o email" }, { status: 400 });
    }

    // 1) Enviar a Pipedrive
    await createPipedriveLead(data);

    // 2) Enviar email
    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: { user: BREVO_USER, pass: BREVO_PASS },
    });

    const { subject, text, html } = emailBodies(data);

    await transporter.sendMail({
      from: EMAIL_FROM,
      to: data.email,
      subject,
      text,
      html,
    });

    return NextResponse.json({ ok: true, message: "Lead enviado y correo enviado" });
  } catch (err: any) {
    console.error("Error en /api/submit:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Error interno" },
      { status: 500 }
    );
  }
}
