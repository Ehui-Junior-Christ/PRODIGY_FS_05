import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const APP_URL = process.env.APP_URL || 'http://localhost:5501';

// ── Template de base ────────────────────────────────────────────────────────
function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Prisme</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- HEADER -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:16px 32px;text-align:center;">
                    <span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-1px;">&#9651; Prisme</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- BODY CARD -->
          <tr>
            <td style="background:rgba(20,20,20,0.9);border:1px solid rgba(255,255,255,0.08);border-radius:24px;overflow:hidden;">
              ${content}
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="color:#444;font-size:12px;margin:0;">
                © 2025 Prisme · Perspectives Partagées<br>
                <a href="${APP_URL}" style="color:#666;text-decoration:none;">Visiter Prisme</a>
                &nbsp;·&nbsp;
                <a href="${APP_URL}" style="color:#666;text-decoration:none;">Se désabonner</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email de vérification ───────────────────────────────────────────────────
export async function sendVerificationEmail(toEmail, toName, verificationLink) {
  const content = `
    <!-- Top accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,#ffffff 0%,#888888 100%);"></div>

    <div style="padding:48px 40px;">
      <!-- Icon -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">
          &#10003;
        </div>
      </div>

      <!-- Title -->
      <h1 style="color:#ffffff;font-size:26px;font-weight:700;text-align:center;margin:0 0 12px;letter-spacing:-0.5px;">
        Vérifiez votre adresse e-mail
      </h1>
      <p style="color:#888;font-size:16px;text-align:center;margin:0 0 40px;line-height:1.6;">
        Bonjour <strong style="color:#fff;">${toName}</strong>, bienvenue sur Prisme.<br>
        Confirmez votre email pour accéder à toutes les fonctionnalités.
      </p>

      <!-- CTA Button -->
      <div style="text-align:center;margin-bottom:40px;">
        <a href="${verificationLink}"
          style="display:inline-block;background:#ffffff;color:#000000;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;letter-spacing:0.3px;">
          Vérifier mon e-mail
        </a>
      </div>

      <!-- Divider -->
      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:32px;"></div>

      <!-- Info box -->
      <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px 24px;">
        <p style="color:#666;font-size:13px;margin:0 0 8px;">
          <strong style="color:#888;">Lien ne fonctionne pas ?</strong> Copiez-collez l'URL suivante dans votre navigateur :
        </p>
        <p style="color:#555;font-size:12px;word-break:break-all;margin:0;">
          ${verificationLink}
        </p>
      </div>

      <p style="color:#444;font-size:12px;text-align:center;margin-top:32px;line-height:1.6;">
        Si vous n'avez pas créé de compte sur Prisme, ignorez simplement cet e-mail.
        <br>Ce lien expire dans 24 heures.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'Prisme <noreply@prisme.app>',
    to: toEmail,
    subject: 'Vérifiez votre adresse e-mail — Prisme',
    html: baseTemplate(content),
  });
}

// ── Email de réinitialisation de mot de passe ───────────────────────────────
export async function sendPasswordResetEmail(toEmail, toName, resetLink) {
  const content = `
    <div style="height:4px;background:linear-gradient(90deg,#ff6b6b 0%,#ee5a24 100%);"></div>

    <div style="padding:48px 40px;">
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;background:rgba(255,107,107,0.1);border:1px solid rgba(255,107,107,0.2);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;color:#ff6b6b;">
          &#128274;
        </div>
      </div>

      <h1 style="color:#ffffff;font-size:26px;font-weight:700;text-align:center;margin:0 0 12px;letter-spacing:-0.5px;">
        Réinitialiser votre mot de passe
      </h1>
      <p style="color:#888;font-size:16px;text-align:center;margin:0 0 40px;line-height:1.6;">
        Bonjour <strong style="color:#fff;">${toName}</strong>,<br>
        Vous avez demandé la réinitialisation de votre mot de passe.
      </p>

      <div style="text-align:center;margin-bottom:40px;">
        <a href="${resetLink}"
          style="display:inline-block;background:#ff6b6b;color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;">
          Réinitialiser mon mot de passe
        </a>
      </div>

      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:32px;"></div>

      <div style="background:rgba(255,107,107,0.05);border:1px solid rgba(255,107,107,0.1);border-radius:12px;padding:20px 24px;">
        <p style="color:#888;font-size:13px;margin:0;">
          <strong style="color:#ff6b6b;">Sécurité :</strong> Si vous n'avez pas demandé cette réinitialisation,
          ignorez cet e-mail. Votre mot de passe restera inchangé.
        </p>
      </div>

      <p style="color:#444;font-size:12px;text-align:center;margin-top:32px;">
        Ce lien expire dans 1 heure.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'Prisme <noreply@prisme.app>',
    to: toEmail,
    subject: 'Réinitialisation de mot de passe — Prisme',
    html: baseTemplate(content),
  });
}

// ── Email de bienvenue (post-vérification) ──────────────────────────────────
export async function sendWelcomeEmail(toEmail, toName) {
  const content = `
    <div style="height:4px;background:linear-gradient(90deg,#6c5ce7 0%,#a29bfe 100%);"></div>

    <div style="padding:48px 40px;text-align:center;">
      <div style="margin-bottom:32px;">
        <div style="display:inline-block;background:rgba(108,92,231,0.1);border:1px solid rgba(108,92,231,0.2);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:36px;">
          &#9733;
        </div>
      </div>

      <h1 style="color:#ffffff;font-size:28px;font-weight:800;margin:0 0 12px;letter-spacing:-0.5px;">
        Bienvenue sur Prisme !
      </h1>
      <p style="color:#888;font-size:16px;margin:0 0 40px;line-height:1.7;">
        Bonjour <strong style="color:#fff;">${toName}</strong>,<br>
        Votre compte est activé. Partagez votre perspective unique avec le monde.
      </p>

      <a href="${APP_URL}"
        style="display:inline-block;background:#ffffff;color:#000;font-size:16px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:50px;margin-bottom:40px;">
        Commencer à explorer
      </a>

      <div style="border-top:1px solid rgba(255,255,255,0.06);margin-bottom:32px;"></div>

      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="padding:8px;">
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;text-align:center;">
              <p style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">Angles</p>
              <p style="color:#666;font-size:13px;margin:0;">Partagez vos perspectives</p>
            </div>
          </td>
          <td align="center" style="padding:8px;">
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:20px;text-align:center;">
              <p style="color:#fff;font-size:20px;font-weight:700;margin:0 0 4px;">Prismes</p>
              <p style="color:#666;font-size:13px;margin:0;">Rejoignez des communautés</p>
            </div>
          </td>
        </tr>
      </table>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM || 'Prisme <noreply@prisme.app>',
    to: toEmail,
    subject: 'Bienvenue sur Prisme — Votre compte est activé !',
    html: baseTemplate(content),
  });
}
