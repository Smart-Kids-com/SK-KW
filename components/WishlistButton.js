"use client";
import { useState, useEffect } from "react";
import { addToWishlist, removeFromWishlist, isInWishlist } from "@/lib/shopify";

export default function WishlistButton({ productId, size = "medium" }) {
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // استخراج ID من Global ID إذا لزم الأمر
    const id = productId.includes('gid://') ? productId.split('/').pop() : productId;
    setInWishlist(isInWishlist(id));
  }, [productId]);

  const handleToggleWishlist = async () => {
    if (loading) return;
    
    setLoading(true);
    const id = productId.includes('gid://') ? productId.split('/').pop() : productId;
    
    try {
      if (inWishlist) {
        removeFromWishlist(id);
        setInWishlist(false);
      } else {
        addToWishlist(id);
        setInWishlist(true);
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const buttonSize = {
    small: { width: "32px", height: "32px", fontSize: "1rem" },
    medium: { width: "40px", height: "40px", fontSize: "1.2rem" },
    large: { width: "48px", height: "48px", fontSize: "1.4rem" }
  };

  const currentSize = buttonSize[size] || buttonSize.medium;

  return (
    <button
      onClick={handleToggleWishlist}
      disabled={loading}
      style={{
        ...currentSize,
        backgroundColor: inWishlist ? "#ff6b6b" : "rgba(255,255,255,0.9)",
        border: inWishlist ? "2px solid #ff6b6b" : "2px solid #ddd",
        borderRadius: "50%",
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: inWishlist ? "white" : "#666",
        transition: "all 0.2s ease",
        opacity: loading ? 0.6 : 1
      }}
      title={inWishlist ? "إزالة من المفضلة" : "إضافة للمفضلة"}
      onMouseEnter={(e) => {
        if (!loading) {
          e.target.style.transform = "scale(1.1)";
        }
      }}
      onMouseLeave={(e) => {
        e.target.style.transform = "scale(1)";
      }}
    >
      {loading ? "⏳" : (inWishlist ? "❤️" : "🤍")}
    </button>
  );
}