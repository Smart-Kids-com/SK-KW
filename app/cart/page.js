"use client";
import { useCart } from "../../lib/cart";
import { useState } from "react";

export default function CartPage() {
  const { cart, removeItem, updateQuantity } = useCart();
  const [note, setNote] = useState("");

  // عربة التسوق فارغة
  if (!cart.items.length) {
    return (
      <section
        style={{
          minHeight: "100vh",
          background: "#3d0856",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: "80px",
        }}
      >
        <h1
          style={{
            color: "#f7e8ff",
            fontWeight: 600,
            fontSize: "2.4rem",
            marginBottom: "36px",
            marginTop: "10px",
            textShadow: "0 4px 14px #0002",
          }}
        >
          عربة التسوق فارغة
        </h1>
        <a
          href="/collections"
          style={{
            background: "transparent",
            color: "#ffd94d",
            border: "2.5px solid #ffd94d",
            borderRadius: "14px",
            fontWeight: 600,
            fontSize: "1.3rem",
            padding: "16px 54px",
            textDecoration: "none",
            marginBottom: "38px",
            boxShadow: "0 0 18px #ffd94d44",
            transition: "all 0.2s",
            position: "relative",
            zIndex: 2,
          }}
        >
          متابعة الشراء
        </a>
        <div style={{ margin: "30px 0 2px", fontSize: "1.18rem" }}>
          ليس لديك حساب ؟
        </div>
        <div style={{ fontSize: "1.1rem", marginBottom: "18px" }}>
          <span>سجل </span>
          <a
            href="/account"
            style={{
              color: "#ffd94d",
              fontWeight: 700,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            الآن
          </a>
          <span> - لتتصفح بطريقة أسهل.</span>
        </div>
      </section>
    );
  }

  // عربة التسوق ممتلئة
  return (
    <section
      style={{
        minHeight: "100vh",
        background: "#3d0856",
        color: "#fff",
        fontFamily: "inherit",
        padding: "0 0 48px 0",
      }}
    >
      {/* الشريط العلوي */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "38px 24px 0 24px",
      }}>
        <span
          style={{
            color: "#fff",
            fontWeight: 600,
            fontSize: "2rem",
            letterSpacing: 0.5,
          }}
        >
          عربة التسوق
        </span>
        <a
          href="/collections"
          style={{
            color: "#ffd94d",
            fontWeight: 600,
            fontSize: "1.18rem",
            textDecoration: "underline",
            borderBottom: "2px solid #ffd94d",
            paddingBottom: 2,
          }}
        >
          متابعة الشراء
        </a>
      </div>
      {/* رؤوس الأعمدة */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-end",
        padding: "0 24px",
        marginTop: "30px",
        borderBottom: "1.6px solid #8b5d9e",
        fontWeight: 500,
        fontSize: "1.13rem",
        color: "#d0b7e8",
      }}>
        <span style={{ flex: 2, textAlign: "right" }}>المنتج</span>
        <span style={{ flex: 1, textAlign: "left" }}>الإجمالي</span>
      </div>

      {/* المنتجات في عربة التسوق */}
      <div style={{
        padding: "16px 24px 0 24px",
        borderBottom: "1.6px solid #8b5d9e",
        marginBottom: "18px"
      }}>
        {cart.items.map(item => (
          <div
            key={item.variantId}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "16px",
              marginBottom: "12px",
            }}
          >
            {/* صورة المنتج */}
            <img
              src={item.image}
              alt={item.title}
              style={{
                width: 90,
                height: 90,
                borderRadius: "12px",
                objectFit: "cover",
                border: "2px solid #fff2",
                background: "#fff1",
                flexShrink: 0,
              }}
            />
            {/* تفاصيل المنتج */}
            <div style={{ flex: 2 }}>
              <div style={{
                color: "#fff",
                fontWeight: 600,
                fontSize: "1.09rem",
                marginBottom: "5px",
                textAlign: "right"
              }}>
                {item.title}
              </div>
              <div style={{
                color: "#d0b7e8",
                fontSize: "1.06rem",
                marginBottom: "7px",
                textAlign: "right"
              }}>
                KWD {Number(item.price).toLocaleString("en-KW", { minimumFractionDigits: 3 })}
              </div>
              {/* التحكم في العدد */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginTop: "7px"
              }}>
                <button
                  onClick={() => updateQuantity(item.variantId, Math.max(1, item.quantity - 1))}
                  style={{
                    background: "none",
                    color: "#ffd94d",
                    border: "2px solid #ffd94d",
                    borderRadius: "10px",
                    width: "40px",
                    height: "40px",
                    fontWeight: 900,
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    boxShadow: "0 0 18px #ffd94d44",
                  }}
                >−</button>
                <span style={{
                  color: "#fff",
                  fontSize: "1.19rem",
                  fontWeight: 600,
                  width: 32,
                  display: "inline-block",
                  textAlign: "center"
                }}>{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.variantId, Math.min(99, item.quantity + 1))}
                  style={{
                    background: "none",
                    color: "#ffd94d",
                    border: "2px solid #ffd94d",
                    borderRadius: "10px",
                    width: "40px",
                    height: "40px",
                    fontWeight: 900,
                    fontSize: "1.5rem",
                    cursor: "pointer",
                    boxShadow: "0 0 18px #ffd94d44",
                  }}
                >+</button>
                {/* زر حذف */}
                <button
                  onClick={() => removeItem(item.variantId)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#ffd94d",
                    fontSize: "1.6rem",
                    cursor: "pointer",
                    marginRight: "16px"
                  }}
                  aria-label="حذف المنتج"
                  title="حذف المنتج"
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M6.5 7h11M10 11v4M14 11v4M7 7V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1m-9 0h10l-1.5 13a2 2 0 0 1-2 1.8h-5a2 2 0 0 1-2-1.8L7 7z"
                      stroke="#ffd94d" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            </div>
            {/* السعر الإجمالي */}
            <div style={{
              flex: 1,
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
              height: "100%",
            }}>
              <div style={{
                color: "#fff",
                fontSize: "1.19rem",
                fontWeight: 600
              }}>
                KWD {(item.price * item.quantity).toLocaleString("en-KW", { minimumFractionDigits: 3 })}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* إضافة ملاحظة */}
      <div style={{ padding: "0 24px", margin: "22px 0 0 0" }}>
        <label
          htmlFor="note"
          style={{
            color: "#ffd94d",
            fontWeight: 600,
            fontSize: "1.15rem",
            marginBottom: "8px",
            display: "block"
          }}
        >
          إضافة ملاحظة
        </label>
        <textarea
          id="note"
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{
            width: "100%",
            minHeight: "100px",
            border: "2.5px solid #ffd94d",
            borderRadius: "14px",
            padding: "14px 18px",
            background: "transparent",
            color: "#fff",
            fontSize: "1.14rem",
            fontWeight: 500,
            marginTop: "4px",
            marginBottom: "18px",
            boxShadow: "0 0 18px #ffd94d44"
          }}
          placeholder=""
        />
      </div>

      {/* الإجمالي وزر الدفع */}
      <div style={{
        textAlign: "center",
        margin: "18px 0 0 0",
        padding: "0 24px"
      }}>
        <div style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          fontWeight: 700,
          fontSize: "1.21rem",
          marginBottom: "9px"
        }}>
          <span style={{ color: "#ffd94d", marginLeft: 12 }}>الإجمالي</span>
          <span style={{ color: "#fff", fontWeight: 600, fontSize: "1.18rem" }}>
            {(cart.subtotal).toLocaleString("en-KW", { minimumFractionDigits: 3 })} KWD
          </span>
        </div>
        <div style={{
          color: "#fff",
          fontSize: "1.02rem",
          marginBottom: "19px"
        }}>
          Taxes included. Discounts and{" "}
          <a href="/shipping" style={{ color: "#ffd94d", textDecoration: "underline" }}>
            shipping
          </a>{" "}
          calculated at checkout.
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          marginBottom: "12px"
        }}>
          <span style={{
            background: "#2ee86c",
            color: "#fff",
            borderRadius: "20px",
            padding: "8px 22px",
            fontWeight: 700,
            fontSize: "1.14rem",
            boxShadow: "0 2px 8px #0002",
            marginInlineEnd: "4px"
          }}>
            Rewards
          </span>
          <a
            href="/checkout"
            style={{
              flex: 1,
              background: "#2e093d",
              color: "#fff",
              borderRadius: "14px",
              fontWeight: 700,
              fontSize: "1.27rem",
              padding: "16px 0",
              textDecoration: "none",
              textAlign: "center",
              boxShadow: "0 0 16px #fff1",
              border: "none",
              outline: "none"
            }}
          >
            الذهاب للدفع
          </a>
        </div>
      </div>
    </section>
  );
}