import { Resend } from "resend";

function otpEmailHtml(params: {
  code: string;
  companyName: string;
  expiresMinutes: number;
  logoUrl?: string | null;
  purpose: "password" | "register";
}) {
  const { code, companyName, expiresMinutes, logoUrl, purpose } = params;
  const digits = code.split("").join(" ");
  const intro =
    purpose === "register"
      ? "بۆ پشتڕاستکردنەوەی ئیمەیڵ و دروستکردنی هەژماری کۆمپانیا، ئەم کۆدە ٦ ژمارەییە بنووسە."
      : "بۆ گۆڕینی وشەی نهێنی هەژماری بەڕێوەبەر، ئەم کۆدە ٦ ژمارەییە بەکاربهێنە.";
  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${companyName}" width="48" height="48" style="display:inline-block;width:48px;height:48px;border-radius:12px;object-fit:contain;background:#fff;" />`
    : `<div style="display:inline-block;width:48px;height:48px;line-height:48px;border-radius:12px;background:rgba(255,255,255,0.15);color:#fff;font-size:22px;font-weight:700;">م</div>`;
  return `<!DOCTYPE html>
<html lang="ckb" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>کۆدی پشتڕاستکردنەوە</title>
</head>
<body style="margin:0;padding:0;background:#f4f7fb;font-family:Tahoma,Arial,sans-serif;direction:rtl;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fb;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #d6dfeb;">
          <tr>
            <td style="background:#2a5a8f;padding:28px 24px;text-align:center;">
              ${logoBlock}
              <h1 style="margin:12px 0 0;color:#ffffff;font-size:22px;">${companyName}</h1>
              <p style="margin:6px 0 0;color:#d7e6f5;font-size:13px;">میدیا ئۆفیس — سیستەمی ئامادەبوون</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px;color:#132238;">
              <h2 style="margin:0 0 12px;font-size:18px;">کۆدی پشتڕاستکردنەوە</h2>
              <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#5a6c84;">
                ${intro}
              </p>
              <div style="text-align:center;margin:8px 0 22px;">
                <div style="display:inline-block;letter-spacing:10px;font-size:36px;font-weight:800;color:#2a5a8f;background:#f0f5fb;border:1px solid #d6dfeb;border-radius:14px;padding:16px 22px;font-family:Consolas,Monaco,monospace;direction:ltr;">
                  ${digits}
                </div>
              </div>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:14px 16px;font-size:13px;line-height:1.7;color:#9a3412;">
                <strong>ئاگاداری ئاسایش:</strong>
                ئەم کۆدە تەنها <strong>${expiresMinutes} خولەک</strong> کارا دەبێت و تەنها یەک جار بەکاردێت.
                کۆدەکە مەدە بە کەسی تر. ئەگەر تۆ ئەم داواکارییەت نەکردووە، پشتگوێی بخە.
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:16px 24px 24px;border-top:1px solid #e8eef6;text-align:center;font-size:12px;color:#5a6c84;">
              © ${new Date().getFullYear()} ${companyName} · میدیا ئۆفیس<br />
              ئەم ئیمەیڵە خۆکار نێردراوە — وەڵام مەدەرەوە.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function sendOtpEmail(params: {
  to: string;
  code: string;
  companyName?: string;
  logoUrl?: string | null;
  purpose: "password" | "register";
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY_MISSING");
  }

  const from =
    process.env.RESEND_FROM_EMAIL || "Media Office <onboarding@resend.dev>";
  const companyName = params.companyName || "Media Office";
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject:
      params.purpose === "register"
        ? `کۆدی تۆمارکردن — ${companyName}`
        : `کۆدی پشتڕاستکردنەوە — ${companyName}`,
    html: otpEmailHtml({
      code: params.code,
      companyName,
      expiresMinutes: 10,
      logoUrl: params.logoUrl,
      purpose: params.purpose,
    }),
  });

  if (error) {
    throw new Error(error.message || "EMAIL_SEND_FAILED");
  }
}

export async function sendPasswordOtpEmail(params: {
  to: string;
  code: string;
  companyName?: string;
  logoUrl?: string | null;
}) {
  return sendOtpEmail({ ...params, purpose: "password" });
}

export async function sendRegistrationOtpEmail(params: {
  to: string;
  code: string;
  companyName?: string;
}) {
  return sendOtpEmail({ ...params, purpose: "register" });
}
