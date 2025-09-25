import Link from "next/link";

export default function CollectionGrid({ collections }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "center" }}>
      {collections.map(col => (
        <Link
          key={col.handle}
          href={`/collections/${col.handle}`}
          style={{
            width: 260,
            background: "#fff",
            borderRadius: 10,
            boxShadow: "0 2px 8px #0001",
            padding: 16,
            textAlign: "center",
            textDecoration: "none",
            color: "#222"
          }}
        >
          <img
            src={col.image?.src}
            alt={col.image?.alt || col.title}
            style={{ width: 220, height: 170, objectFit: "cover", borderRadius: 8 }}
          />
          <h2 style={{ fontWeight: 600, margin: "1rem 0 0.5rem", fontSize: "1.15rem", color: "var(--color-primary)" }}>
            {col.title}
          </h2>
        </Link>
      ))}
    </div>
  );
}