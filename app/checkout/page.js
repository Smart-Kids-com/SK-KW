export default function CheckoutPage() {
  return (
    <section style={{ maxWidth: 700, margin: "3rem auto", textAlign: "center" }}>
      <h1 style={{ color: "var(--color-primary)", marginBottom: 24 }}>إكمال الطلب</h1>
      <div style={{ color: "#888", fontSize: "1.2rem", margin: "2rem 0" }}>
        سيتم توجيهك إلى صفحة الدفع لإكمال عملية الشراء.
      </div>
      <a
        href="https://smartkidskw.com/cart"
        style={{
          background: "var(--color-accent)",
          color: "#222",
          padding: "14px 40px",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: "1.1rem",
          textDecoration: "none"
        }}
      >
        الذهاب لعربة التسوق الأصلية
      </a>
    </section>
  );
}