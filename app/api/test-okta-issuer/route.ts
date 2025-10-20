import { NextResponse } from "next/server";

export async function GET() {
  const domain = process.env.NEXT_PUBLIC_OKTA_DOMAIN;

  const issuers = [
    `https://${domain}`,
    `https://${domain}/oauth2/default`,
  ];

  const results = [];

  for (const issuer of issuers) {
    const wellKnownUrl = `${issuer}/.well-known/openid-configuration`;

    try {
      const response = await fetch(wellKnownUrl);
      const data = await response.json();

      results.push({
        issuer,
        status: response.status,
        accessible: response.ok,
        wellKnownUrl,
        data: response.ok ? data : null,
        error: response.ok ? null : data,
      });
    } catch (error) {
      results.push({
        issuer,
        accessible: false,
        wellKnownUrl,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({
    domain,
    results,
    recommendation: results.find((r) => r.accessible)?.issuer || "None accessible",
  });
}
