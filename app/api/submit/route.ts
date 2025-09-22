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

  // ===== HTML con overlay centrado “▶ Reproducir” (Gmail/Apple Mail) + VML para Outlook =====
  const html = `
<div style="font-family:Arial,'Helvetica Neue',Helvetica,sans-serif;line-height:1.55;color:#111">
  <p style="margin:0 0 14px">${lead}</p>

  <!--[if mso]>
  <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
    arcsize="6%" stroke="f" fill="t" style="width:560px;height:315px;">
    <v:fill type="frame" src="${VIDEO_THUMB}" color="#000000" />
    <w:anchorlock/>
    <center style="text-align:center">
      <a href="${VIDEO_URL}" style="text-decoration:none;">
        <span style="font-family:Arial,sans-serif;display:inline-block;padding:12px 18px;border-radius:9999px;background:#000000;color:#ffffff;font-weight:700;">
          ▶ Reproducir
        </span>
      </a>
    </center>
  </v:roundrect>
  <![endif]-->

  <!--[if !mso]><!-- -->
  <a href="${VIDEO_URL}" target="_blank" rel="noopener"
     style="position:relative;display:inline-block;line-height:0;border-radius:12px;overflow:hidden;margin:6px 0 18px">
    <img src="${VIDEO_THUMB}" width="560"
         style="display:block;max-width:100%;height:auto;border:0" alt="Ver video en YouTube" />
    <span style="
      position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);
      background:#000000cc;border-radius:9999px;padding:12px 18px;
      color:#ffffff;font-weight:700;font-size:16px;font-family:Arial,sans-serif;line-height:16px;">
      ▶ Reproducir
    </span>
  </a>
  <!--<![endif]-->

  <!-- Botón principal -->
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
