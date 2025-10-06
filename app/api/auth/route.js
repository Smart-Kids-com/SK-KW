import { NextResponse } from "next/server";
import { customerLogin, createCustomer } from "@/lib/shopify";

export async function POST(request) {
  try {
    const { action, email, password, firstName, lastName } = await request.json();

    if (action === "login") {
      // تسجيل الدخول
      const accessToken = await customerLogin(email, password);
      return NextResponse.json({
        success: true,
        accessToken: accessToken.accessToken,
        expiresAt: accessToken.expiresAt
      });
    } 
    
    else if (action === "register") {
      // إنشاء حساب جديد
      const customer = await createCustomer(email, password, firstName, lastName);
      
      // تسجيل دخول تلقائي بعد التسجيل
      const accessToken = await customerLogin(email, password);
      
      return NextResponse.json({
        success: true,
        customer,
        accessToken: accessToken.accessToken,
        expiresAt: accessToken.expiresAt
      });
    }

    return NextResponse.json({
      success: false,
      error: "Invalid action"
    }, { status: 400 });

  } catch (error) {
    console.error("Auth error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Authentication failed"
    }, { status: 400 });
  }
}