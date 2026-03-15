import fs from "fs";

const LIMIT = Number(process.env.LIMIT || 50);
const src = "public/products-source.json";
const out = "public/products.json";

const raw = JSON.parse(fs.readFileSync(src, "utf8"));
const list = Array.isArray(raw?.products) ? raw.products : [];

const stripHtml = (s="") => String(s).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();

const isInStock = (p) => {
  const vs = Array.isArray(p?.variants) ? p.variants : [];
  if (vs.length === 0) return true;
  return vs.some(v => v && v.available === true);
};

const filtered = list.filter(isInStock);

const simplified = filtered.slice(0, LIMIT).map((p, idx) => {
  const v0 = Array.isArray(p.variants) ? (p.variants.find(v => v?.available) || p.variants[0]) : null;
  const price = v0?.price != null ? Number(v0.price) : 0;

  const img0 = Array.isArray(p.images) ? p.images[0] : null;
  const image = img0?.src || "";

  return {
    id: p.handle || p.id || idx + 1,
    name: p.title || "منتج بدون اسم",
    price: Number.isFinite(price) ? price : 0,
    image: image || "https://via.placeholder.com/600x600?text=Product",
    description: (stripHtml(p.body_html || "") || "وصف المنتج غير متوفر").slice(0, 220),
    category: (p.product_type || "عام").trim() || "عام",
    inStock: true
  };
});

fs.writeFileSync(out, JSON.stringify(simplified, null, 2), "utf8");
console.log(`✅ Done: ${simplified.length} in-stock products -> ${out}`);
