"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function CollectionGrid({ collections = [] }) {
  if (!Array.isArray(collections) || collections.length === 0) return null;

  const pathname = usePathname() || "/";
  const base = pathname.startsWith("/ar") ? "/ar" : "";

  return (
    <div
      dir="rtl"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 20,
        alignItems: "stretch",
      }}
    >
      {collections.filter(Boolean).map((col) => {
        const handle = col?.handle || "";
        const href = `${base}/collections/${encodeURIComponent(handle)}`;
        const imgUrl = col?.image?.url || null;
        const imgAlt = col?.image?.altText || col?.title || "collection";

        return (
          <Link
            key={handle || col?.id}
            href={href}
            style={{
              background: "#fff",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              padding: 16,
              textAlign: "center",
              textDecoration: "none",
              color: "#222",
              display: "grid",
              gap: 12,
              alignContent: "start",
              transition: "transform .15s ease, box-shadow .15s ease",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "11 / 8",
                borderRadius: 10,
                overflow: "hidden",
                background: "#f6f6f6",
              }}
            >
              {imgUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imgUrl}
                  alt={imgAlt}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontSize: "2rem",
                    color: "#bbb",
                  }}
                >
                  📚
                </div>
              )}
            </div>

            <h2
              style={{
                margin: "0.25rem 0 0",
                fontWeight: 700,
                fontSize: "1.05rem",
                color: "var(--color-primary, #9422af)",
              }}
            >
              {col?.title || "مجموعة"}
            </h2>

            <style jsx>{`
              a:hover {
                transform: translateY(-2px);
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.12);
              }
            `}</style>
          </Link>
        );
      })}
    </div>
  );
}
