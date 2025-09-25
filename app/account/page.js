"use client";
import { t } from "../../lib/i18n";

export default function AccountPage() {
  const locale = "ar";
  return (
    <section style={{ maxWidth: 600, margin: "3rem auto", textAlign: "center" }}>
      <h1 style={{ color: "var(--color-primary)", marginBottom: 24 }}>{t("customer.account.title", locale) || "الحساب"}</h1>
      <div style={{ marginBottom: 32 }}>
        <a
          href="https://account.smartkidskw.com/authentication/login"
          style={{
            background: "var(--color-primary)",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "1.1rem",
            textDecoration: "none"
          }}
        >
          {t("customer.log_in", locale) || "تسجيل الدخول"}
        </a>
      </div>
      <div>
        <a
          href="https://account.smartkidskw.com/authentication/register"
          style={{
            background: "var(--color-secondary)",
            color: "#fff",
            padding: "12px 28px",
            borderRadius: 8,
            fontWeight: 600,
            fontSize: "1.1rem",
            textDecoration: "none"
          }}
        >
          {t("customer.register", locale) || "إنشاء حساب جديد"}
        </a>
      </div>
      <div style={{ color: "#888", marginTop: 40 }}>
        بعد تسجيل الدخول ستتمكن من رؤية طلباتك وتحديث معلوماتك الشخصية.
      </div>
    </section>
  );
}