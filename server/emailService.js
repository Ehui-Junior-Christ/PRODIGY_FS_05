import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FROM_ADDRESS = process.env.MAIL_FROM || "Prisme <support@prisme.app>";
const REPLY_TO = process.env.MAIL_REPLY_TO || process.env.MAIL_USER || "support@prisme.app";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function baseTemplate({ eyebrow, title, body, ctaLabel, ctaUrl, note, tone = "lime" }) {
  const accent = tone === "danger" ? "#ff6b4a" : tone === "welcome" ? "#48d6d2" : "#a3ff12";
  const safeTitle = escapeHtml(title);
  const safeBody = body;

  return `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background:#090a0c;color:#f4f2ea;font-family:Arial,Helvetica,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;color:transparent;">
    ${safeTitle} - Prisme
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#090a0c;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;">
          <tr>
            <td style="padding:0 0 18px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:38px;height:38px;border-radius:12px;background:${accent};color:#10130a;text-align:center;font-size:22px;font-weight:800;">△</td>
                  <td style="padding-left:12px;color:#f4f2ea;font-size:22px;font-weight:800;letter-spacing:-0.2px;">Prisme</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="border:1px solid rgba(244,242,234,0.12);border-radius:22px;overflow:hidden;background:#14171c;">
              <div style="height:5px;background:${accent};"></div>
              <div style="padding:34px 30px 30px;">
                <p style="margin:0 0 12px;color:${accent};font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:0.12em;">${escapeHtml(eyebrow)}</p>
                <h1 style="margin:0 0 16px;color:#f4f2ea;font-size:28px;line-height:1.16;font-weight:800;">${safeTitle}</h1>
                <div style="color:#c6ccd4;font-size:16px;line-height:1.65;margin:0 0 28px;">${safeBody}</div>
                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 26px;">
                  <tr>
                    <td style="border-radius:14px;background:${accent};">
                      <a href="${ctaUrl}" style="display:inline-block;padding:15px 24px;color:#10130a;text-decoration:none;font-weight:800;font-size:15px;">${escapeHtml(ctaLabel)}</a>
                    </td>
                  </tr>
                </table>
                <div style="padding:16px;border:1px solid rgba(244,242,234,0.1);border-radius:14px;background:rgba(244,242,234,0.04);">
                  <p style="margin:0;color:#a5adb7;font-size:13px;line-height:1.55;">${note}</p>
                </div>
                <p style="margin:22px 0 0;color:#747d89;font-size:12px;line-height:1.55;">
                  Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
                  <a href="${ctaUrl}" style="color:${accent};word-break:break-all;">${ctaUrl}</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding:22px 10px 0;color:#626b76;font-size:12px;line-height:1.55;">
              Prisme - Perspectives partagées<br>
              <a href="${APP_URL}" style="color:#8b949f;text-decoration:none;">${APP_URL}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function sendTransactionalMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: FROM_ADDRESS,
    replyTo: REPLY_TO,
    to,
    subject,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `prisme-${Date.now()}`,
      "X-Auto-Response-Suppress": "OOF, AutoReply",
    },
  });
}

export async function sendVerificationEmail(toEmail, toName, verificationLink) {
  const name = escapeHtml(toName || "Bienvenue");
  const html = baseTemplate({
    eyebrow: "Verification du compte",
    title: "Vérifiez votre adresse e-mail",
    body: `<p style="margin:0;">Bonjour <strong style="color:#f4f2ea;">${name}</strong>, confirmez votre adresse e-mail pour activer votre compte Prisme et publier vos Angles.</p>`,
    ctaLabel: "Vérifier mon e-mail",
    ctaUrl: verificationLink,
    note: "Ce lien expire dans 24 heures. Si vous n'avez pas créé de compte sur Prisme, vous pouvez ignorer cet e-mail.",
  });

  await sendTransactionalMail({
    to: toEmail,
    subject: "Vérifiez votre e-mail pour Prisme",
    html,
    text: `Bonjour ${toName || ""}, vérifiez votre e-mail Prisme : ${verificationLink}\nCe lien expire dans 24 heures.`,
  });
}

export async function sendPasswordResetEmail(toEmail, toName, resetLink) {
  const name = escapeHtml(toName || "Bonjour");
  const html = baseTemplate({
    eyebrow: "Securite du compte",
    title: "Réinitialisez votre mot de passe",
    body: `<p style="margin:0;">Bonjour <strong style="color:#f4f2ea;">${name}</strong>, utilisez ce lien pour choisir un nouveau mot de passe Prisme.</p>`,
    ctaLabel: "Réinitialiser mon mot de passe",
    ctaUrl: resetLink,
    note: "Ce lien expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.",
    tone: "danger",
  });

  await sendTransactionalMail({
    to: toEmail,
    subject: "Réinitialisation de mot de passe - Prisme",
    html,
    text: `Bonjour ${toName || ""}, réinitialisez votre mot de passe Prisme : ${resetLink}\nCe lien expire dans 1 heure.`,
  });
}

export async function sendWelcomeEmail(toEmail, toName) {
  const html = baseTemplate({
    eyebrow: "Compte active",
    title: "Bienvenue sur Prisme",
    body: `<p style="margin:0;">Bonjour <strong style="color:#f4f2ea;">${escapeHtml(toName || "")}</strong>, votre compte est prêt. Vous pouvez maintenant partager vos perspectives et suivre les Prismes qui vous intéressent.</p>`,
    ctaLabel: "Ouvrir Prisme",
    ctaUrl: APP_URL,
    note: "Cet e-mail confirme l'activation de votre compte. Gardez-le comme repère officiel de Prisme.",
    tone: "welcome",
  });

  await sendTransactionalMail({
    to: toEmail,
    subject: "Bienvenue sur Prisme",
    html,
    text: `Bienvenue sur Prisme, ${toName || ""}. Ouvrir l'application : ${APP_URL}`,
  });
}
