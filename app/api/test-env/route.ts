import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    environment: {
      shopName: process.env.SHOPIFY_SHOP_NAME || "NOT_SET",
      hasAccessToken: !!process.env.SHOPIFY_ACCESS_TOKEN,
      accessTokenPrefix: process.env.SHOPIFY_ACCESS_TOKEN
        ? process.env.SHOPIFY_ACCESS_TOKEN.substring(0, 10) + "..."
        : "NOT_SET",
      apiVersion: process.env.SHOPIFY_API_VERSION || "NOT_SET",
      nodeEnv: process.env.NODE_ENV,
    },
    allEnvVars: Object.keys(process.env).filter((key) => key.startsWith("SHOPIFY_")),
  });
}
