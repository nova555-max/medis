"use client";

type QrPrintPosterProps = {
  dataUrl: string | null;
  token: string;
  label?: string;
  companyName?: string;
  logoUrl?: string | null;
  expiresHint?: string;
};

export function QrPrintPoster({
  dataUrl,
  token,
  label = "سەرەکی",
  companyName = "Media Office",
  logoUrl,
  expiresHint,
}: QrPrintPosterProps) {
  return (
    <article className="qr-print-poster" dir="rtl">
      <div className="qr-print-poster__frame">
        <div className="qr-print-poster__corner qr-print-poster__corner--tl" />
        <div className="qr-print-poster__corner qr-print-poster__corner--tr" />
        <div className="qr-print-poster__corner qr-print-poster__corner--bl" />
        <div className="qr-print-poster__corner qr-print-poster__corner--br" />

        <header className="qr-print-poster__header">
          <div className="qr-print-poster__brand">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={companyName}
                className="qr-print-poster__logo"
              />
            ) : (
              <div className="qr-print-poster__logo-fallback" aria-hidden>
                م
              </div>
            )}
            <div>
              <p className="qr-print-poster__company">{companyName}</p>
              <p className="qr-print-poster__tagline">سیستەمی ئامادەبوون</p>
            </div>
          </div>
          <div className="qr-print-poster__badge">کۆدی QR</div>
        </header>

        <div className="qr-print-poster__hero">
          <h1 className="qr-print-poster__title">تۆمارکردنی ئامادەبوون</h1>
          <p className="qr-print-poster__subtitle">
            ئەم کۆدە بە ئەپی کارمەند سکان بکە بۆ چوونەژوورەوە
          </p>
          <p className="qr-print-poster__label">{label}</p>
        </div>

        <div className="qr-print-poster__code-wrap">
          <div className="qr-print-poster__code-ring">
            {dataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={dataUrl}
                alt="کۆدی QR"
                className="qr-print-poster__code"
              />
            ) : (
              <div className="qr-print-poster__code-placeholder">...</div>
            )}
          </div>
        </div>

        <ul className="qr-print-poster__steps">
          <li>
            <span>١</span>
            ئەپی کارمەند بکەرەوە
          </li>
          <li>
            <span>٢</span>
            دوگمەی چوونەژوورەوە بگرە
          </li>
          <li>
            <span>٣</span>
            ئەم QRـە سکان بکە
          </li>
        </ul>

        {expiresHint ? (
          <p className="qr-print-poster__expiry">{expiresHint}</p>
        ) : null}

        <footer className="qr-print-poster__footer">
          <p className="qr-print-poster__footer-note">
            تەنها بۆ کارمەندانی ناو کۆمپانیا · کۆدەکە مەدە بە کەسی دەرەوە
          </p>
          <p className="qr-print-poster__token" dir="ltr">
            {token.slice(0, 12)}…{token.slice(-6)}
          </p>
        </footer>
      </div>
    </article>
  );
}
