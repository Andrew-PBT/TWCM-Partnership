import { OktaAuth } from "@okta/okta-auth-js";

export const oktaAuth = new OktaAuth({
  issuer: process.env.NEXT_PUBLIC_OKTA_ISSUER!,
  clientId: process.env.NEXT_PUBLIC_OKTA_CLIENT_ID!,
  redirectUri: process.env.NEXT_PUBLIC_OKTA_REDIRECT_URI!,
  postLogoutRedirectUri: process.env.NEXT_PUBLIC_OKTA_POST_LOGOUT_REDIRECT_URI!,
  scopes: ["openid", "profile", "email"],
  pkce: true, // PKCE is the secure standard for SPAs
  responseType: "code", // Authorization code with PKCE
  restoreOriginalUri: async (oktaAuth, originalUri) => {
    window.location.replace(originalUri || "/");
  },
});

export const oktaConfig = {
  issuer: process.env.NEXT_PUBLIC_OKTA_ISSUER!,
  clientId: process.env.NEXT_PUBLIC_OKTA_CLIENT_ID!,
  redirectUri: process.env.NEXT_PUBLIC_OKTA_REDIRECT_URI!,
  postLogoutRedirectUri: process.env.NEXT_PUBLIC_OKTA_POST_LOGOUT_REDIRECT_URI!,
  scopes: ["openid", "profile", "email"],
  pkce: true,
  responseType: "code",
};
