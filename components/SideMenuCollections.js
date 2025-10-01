import { useEffect, useState } from "react";
import Link from "next/link";
import { getCollections } from "../lib/shopify";

export default function SideMenuCollections({ onSelect }) {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    async function fetchData() {
      const data = await getCollections(30); // عدّل العدد لو تحب
      setCollections(data);
    }
    fetchData();
  }, []);

  return (
    <nav style={{ padding: "1rem" }}>
      <h3 style={{ marginBottom: "1rem" }}>المجموعات</h3>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {collections.map((col) => (
          <li key={col.handle} style={{ marginBottom: "1rem" }}>
            <Link href={`/collections/${col.handle}`} onClick={onSelect} style={{ color: "#222", textDecoration: "none", fontWeight: "bold" }}>
              {col.title}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}