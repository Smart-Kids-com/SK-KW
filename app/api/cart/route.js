  // app/api/cart/route.js
  import { NextResponse } from "next/server";
  import { fetchShopifyGraphQL } from "@/lib/shopify";

  // حقول كارت مشتركة
  const CART_FIELDS = `
    id
    checkoutUrl
    totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 100) {
      edges {
        node {
          id
          quantity
          cost { totalAmount { amount currencyCode } }
          merchandise {
            __typename
            ... on ProductVariant {
              id
              title
              price { amount currencyCode }
              product { title featuredImage { url altText } }
            }
          }
        }
      }
      pageInfo { hasNextPage endCursor }
    }
  `;

  // Queries/Mutations
  const CART_QUERY = /* GraphQL */ `
    query cart($id: ID!) {
      cart(id: $id) { ${CART_FIELDS} }
    }
  `;

  const CART_CREATE = /* GraphQL */ `
    mutation cartCreate($lines:[CartLineInput!]) {
      cartCreate(input:{ lines:$lines }) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }
  `;

  const CART_LINES_ADD = /* GraphQL */ `
    mutation cartLinesAdd($cartId:ID!, $lines:[CartLineInput!]!) {
      cartLinesAdd(cartId:$cartId, lines:$lines) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }
  `;

  const CART_LINES_UPDATE = /* GraphQL */ `
    mutation cartLinesUpdate($cartId:ID!, $lines:[CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId:$cartId, lines:$lines) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }
  `;

  const CART_LINES_REMOVE = /* GraphQL */ `
    mutation cartLinesRemove($cartId:ID!, $lineIds:[ID!]!) {
      cartLinesRemove(cartId:$cartId, lineIds:$lineIds) {
        cart { ${CART_FIELDS} }
        userErrors { message }
      }
    }
  `;

  export async function POST(req) {
    const body = await req.json();
    const { action } = body || {};

    try {
      if (action === "get") {
        const { cartId } = body;
        if (!cartId) return NextResponse.json({ cart: null });
        const d = await fetchShopifyGraphQL(CART_QUERY, { id: cartId });
        return NextResponse.json({ cart: d?.cart || null });
      }

      if (action === "add") {
        const { cartId, variantId, quantity = 1 } = body;
        if (!variantId) return NextResponse.json({ error: "Missing variantId" }, { status: 400 });
        const lines = [{ merchandiseId: variantId, quantity: Number(quantity) }];

        if (cartId) {
          const d = await fetchShopifyGraphQL(CART_LINES_ADD, { cartId, lines });
          const err = d?.cartLinesAdd?.userErrors?.[0]?.message;
          if (err) return NextResponse.json({ error: err }, { status: 400 });
          return NextResponse.json({ cart: d?.cartLinesAdd?.cart });
        } else {
          const d = await fetchShopifyGraphQL(CART_CREATE, { lines });
          const err = d?.cartCreate?.userErrors?.[0]?.message;
          if (err) return NextResponse.json({ error: err }, { status: 400 });
          return NextResponse.json({ cart: d?.cartCreate?.cart });
        }
      }

      if (action === "update") {
        const { cartId, lineId, quantity } = body;
        if (!cartId || !lineId || typeof quantity !== "number")
          return NextResponse.json({ error: "Missing cartId/lineId/quantity" }, { status: 400 });

        const d = await fetchShopifyGraphQL(CART_LINES_UPDATE, {
          cartId,
          lines: [{ id: lineId, quantity: Math.max(1, Math.min(99, quantity)) }],
        });
        const err = d?.cartLinesUpdate?.userErrors?.[0]?.message;
        if (err) return NextResponse.json({ error: err }, { status: 400 });
        return NextResponse.json({ cart: d?.cartLinesUpdate?.cart });
      }

      if (action === "remove") {
        const { cartId, lineId } = body;
        if (!cartId || !lineId)
          return NextResponse.json({ error: "Missing cartId/lineId" }, { status: 400 });

        const d = await fetchShopifyGraphQL(CART_LINES_REMOVE, {
          cartId,
          lineIds: [lineId],
        });
        const err = d?.cartLinesRemove?.userErrors?.[0]?.message;
        if (err) return NextResponse.json({ error: err }, { status: 400 });
        return NextResponse.json({ cart: d?.cartLinesRemove?.cart });
      }

      return NextResponse.json({ error: "Unsupported action" }, { status: 400 });
    } catch (e) {
      return NextResponse.json({ error: e?.message || "Unknown error" }, { status: 500 });
    }
  }