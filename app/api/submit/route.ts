// app/api/submit/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

type Payload = {
  name: string;
  company?: string;
  email: string;
  country?: string;
  answers?: any;
  qualifies?: boolean; // viene del front
};

/* ========= SMTP ========= */
const BREVO_USER = process.env.BREVO_SMTP_USER!;
const BREVO_PASS = process.env.BREVO_SMTP_PASS!;
const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";

/* ========= SITIO & VIDEO ========= */
const SITE_URL = "https://grupoinforum.com";
const VIDEO_ID = "Eau96xNp3Ds";
const VIDEO_URL = `https://youtu.be/${VIDEO_ID}`;
const VIDEO_THUMB = `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`;

/* Un ícono de play rojo estilo YouTube como SVG embebido (transparente, con sombra suave) */
const PLAY_SVG_DATA_URI =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="140" height="98" viewBox="0 0 140 98">
  <defs>
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur in="SourceAlpha" stdDeviation="4"/><feOffset dy="2"/>
      <feComponentTransfer><feFuncA type="linear" slope="0.35"/></feComponentTransfer>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <g filter="url(#s)">
    <rect x="0" y="0" rx="22" ry="22" width="140" height="98" fill="#FF0000"/>
    <polygon points="58,30 58,68 92,49" fill="#FFFFFF"/>
  </g>
</svg>
`);

/* ========= EMAIL BODIES ========= */
function emailBodies(data: Payload) {
  const qualifies = !!data.qualifies;

  const subject = qualifies
    ? "Tu diagnóstico califica – Grupo Inforum"
    : "Gracias por tu diagnóstico – Grupo Inforum";

  const lead = qualifies
    ? "¡Felicidades! Estás a 1 paso de obtener tu asesoría sin costo. Rita Muralles se estará comunicando contigo para agendar una sesión corta de 30 minutos para presentarnos y realizar unas últimas dudas para guiarte de mejor manera."
    : "¡Gracias por llenar el cuestionario! Por el momento nuestro equipo se encuentra con cupo lleno. Te estaremos contactando al liberar espacio. Por lo pronto te invitamos a conocer más de nosotros.";

  // Fallback de texto plano
  const text = `${lead}

Ver video: ${VIDEO_URL}

Website: ${SITE_URL}`.trim();

  /* =========
     HTML: Miniatura + PLAY centrado (stacking “bulletproof”)
     - 1) Imagen miniatura
     - 2) Imagen del play rojo, con margin-top negativo en %
         para posicionarla sobre la miniatura, y margin-bottom
         positivo para recuperar el flujo del layout.
     - 3) Botón principal “Visita nuestro website”
     ========= */
  const html = `
<div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;line-height:1.55;color:#111">
  <p style="margin:0 0 14px">${lead}</p>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px">
    <tr>
      <td align="center" style="padding:0">
        <a href="${VIDEO_URL}" target="_blank" rel="noopener" style="text-decoration:none;border:0;">
          <img src="${VIDEO_THUMB}" width="560" alt="Ver video en YouTube"
               style="display:block;max-width:100%;height:auto;border:0;border-radius:12px;line-height:0" />
        </a>

        <!-- PLAY rojo centrado (stacked image). 
             Ajusta los porcentajes si cambias la relación de aspecto de la miniatura -->
        <a href="${VIDEO_URL}" target="_blank" rel="noopener" style="text-decoration:none;border:0;display:block;line-height:0;">
          <img src="${PLAY_SVG_DATA_URI}" width="140" height="98" alt="Reproducir"
               style="display:block;border:0;margin-top:-32%;margin-bottom:16%;height:auto;" />
        </a>
      </td>
    </tr>
  </table>

  <!-- CTA único -->
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
      text, // fallback
      html,
    });

    return NextResponse.json({ ok: true, message: "Correo enviado" });
  } catch (err: any) {
    console.error("Error en /api/submit:", err?.message || err);
    return NextResponse.json({ ok: false, error: err?.message || "Error interno" }, { status: 500 });
  }
}
