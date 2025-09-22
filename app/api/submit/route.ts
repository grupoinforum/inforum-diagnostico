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
  qualifies?: boolean;
};

const PD_DOMAIN = process.env.PIPEDRIVE_DOMAIN;
const PD_API = process.env.PIPEDRIVE_API_KEY;

const BREVO_USER = process.env.BREVO_SMTP_USER;
const BREVO_PASS = process.env.BREVO_SMTP_PASS;
const EMAIL_FROM = process.env.EMAIL_FROM || "Inforum <info@inforumsol.com>";

/* ========= CONSTANTES ========= */
const SITE_URL = "https://grupoinforum.com";
const SITE_HOST = SITE_URL.replace(/^https?:\/\//, "");

const VIDEO_ID = "Eau96xNp3Ds";
const VIDEO_URL = `https://youtu.be/${VIDEO_ID}`;
const VIDEO_THUMB = `https://img.youtube.com/vi/${VIDEO_ID}/hqdefault.jpg`;

/* ========= FUNCIÓN EMAIL ========= */
function emailBodies(data: Payload) {
  const qualifies = !!data.qualifies;

  const subject = qualifies
    ? "Tu diagnóstico califica – Grupo Inforum"
    : "Gracias por tu diagnóstico – Grupo Inforum";

  const lead = qualifies
    ? "¡Felicidades! Estás a 1 paso de obtener tu asesoría sin costo. Rita Muralles se estará comunicando contigo para agendar una sesión corta de 30 minutos para presentarnos y realizar unas últimas dudas para guiarte de mejor manera."
    : "¡Gracias por llenar el cuestionario! Por el momento nuestro equipo se encuentra con cupo lleno. Te estaremos contactando al liberar espacio. Por lo pronto te invitamos a conocer más de nosotros.";

  // Texto plano (fallback)
  const text =
`${lead}

Mira el video: ${VIDEO_URL}

Visítanos: ${SITE_URL}
`;

  // Tamaño miniatura
  const THUMB_W = 560;
  const THUMB_H = 315;

  // HTML
  const html = `
<div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;line-height:1.55;color:#111111">
  <p style="margin:0 0 14px">${lead}</p>

  <!-- Miniatura con overlay Play -->
  <div style="margin:6px 0 18px">
    <!--[if gte mso 9]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${VIDEO_URL}"
      style="height:${THUMB_H}px;v-text-anchor:middle;width:${THUMB_W}px;" arcsize="6%" stroke="f" fill="t">
      <v:fill type="frame" src="${VIDEO_THUMB}" color="#000000"/>
      <v:textbox inset="0,0,0,0">
        <div style="text-align:center;">
          <span style="display:inline-block;background:#000000;opacity:.75;border-radius:999px;padding:12px 18px;color:#ffffff;font-weight:700;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
            ▶︎ Ver video
          </span>
        </div>
      </v:textbox>
    </v:roundrect>
    <![endif]-->

    <!--[if !mso]><!-- -->
    <a href="${VIDEO_URL}" target="_blank" rel="noopener"
       style="background:url('${VIDEO_THUMB}') no-repeat center/cover;display:block;border-radius:12px;width:${THUMB_W}px;max-width:100%;height:${THUMB_H}px;text-decoration:none;position:relative;overflow:hidden">
      <span style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#000000cc;border-radius:999px;padding:12px 18px;color:#ffffff;font-weight:700;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;">
        ▶︎ Ver video
      </span>
    </a>
    <!--<![endif]-->
  </div>

  <!-- Botón Visítanos -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 6px">
    <tr>
      <td bgcolor="#082a49" style="border-radius:10px">
        <a href="${SITE_URL}" target="_blank" rel="noopener"
           style="font-size:16px;line-height:16px;font-weight:600;color:#ffffff;text-decoration:none;padding:12px 18px;display:inline-block">
          Visítanos
        </a>
      </td>
    </tr>
  </table>

  <p style="margin:8px 0 0">
    <a href="${SITE_URL}" target="_blank" rel="noopener" style="color:#2563EB;text-decoration:underline">
      ${SITE_HOST}
    </a>
  </p>
</div>`.trim();

  return { subject, text, html };
}

/* ========= HANDLER ========= */
export async function POST(req: Request) {
  try {
    const data = (await req.json()) as Payload;

    // Email
    const { subject, text, html } = emailBodies(data);

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      auth: {
        user: BREVO_USER,
        pass: BREVO_PASS,
      },
    });

    await transporter.sendMail({
      from: EMAIL_FROM,
      to: data.email,
      subject,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Error en submit:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Error interno" },
      { status: 500 }
    );
  }
}
