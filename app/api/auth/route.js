// app/api/auth/route.js
import { NextResponse } from "next/server";
import { customerLogin, createCustomer } from "@/lib/shopify";

export async function POST(request) {
  try {
    const payload = await request.json().catch(() => ({}));
    const action = payload?.action;

    if (action === "login") {
      const { email, password } = payload || {};
      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: "البريد وكلمة المرور مطلوبان" },
          { status: 400 }
        );
      }

      const token = await customerLogin(email, password);
      return NextResponse.json(
        {
          success: true,
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
        },
        { status: 200 }
      );
    }

    if (action === "register") {
      const { email, password, firstName = "", lastName = "" } = payload || {};
      if (!email || !password) {
        return NextResponse.json(
          { success: false, error: "البريد وكلمة المرور مطلوبان" },
          { status: 400 }
        );
      }

      // إنشاء العميل
      const customer = await createCustomer(email, password, firstName, lastName);

      // تسجيل الدخول مباشرة بعد الإنشاء
      const token = await customerLogin(email, password);

      return NextResponse.json(
        {
          success: true,
          customer,
          accessToken: token.accessToken,
          expiresAt: token.expiresAt,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Authentication failed" },
      { status: 400 }
    );
  }
}
