import type { NextApiRequest, NextApiResponse } from "next";

import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";

import getAppKeysFromSlug from "@calcom/app-store/_utils/getAppKeysFromSlug";

/**
 * Admin Consent endpoint for Microsoft Outlook/Office 365 Calendar
 * GET /api/admin-consent/outlook
 *
 * Query params:
 * - tenant_id: Azure AD tenant ID (required)
 *
 * Redirects to Microsoft's admin consent screen where an Azure AD admin
 * can grant organization-wide consent for the calendar integration.
 * Uses the configured MS_GRAPH_CLIENT_ID from the app store.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { tenant_id } = req.query;

  if (!tenant_id || typeof tenant_id !== "string") {
    return res.status(400).json({ message: "tenant_id query parameter is required" });
  }

  // Get client_id from app store configuration (seeded from MS_GRAPH_CLIENT_ID)
  const appKeys = await getAppKeysFromSlug("office365-calendar");
  const clientId = appKeys.client_id;

  if (!clientId || typeof clientId !== "string") {
    return res.status(500).json({ message: "Office 365 client_id not configured. Set MS_GRAPH_CLIENT_ID." });
  }

  // Use the same callback URL pattern as the regular OAuth flow
  const redirectUri = `${WEBAPP_URL_FOR_OAUTH}/api/admin-consent/outlook/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
  });

  const adminConsentUrl = `https://login.microsoftonline.com/${tenant_id}/adminconsent?${params.toString()}`;

  // Redirect to Microsoft admin consent screen
  res.redirect(adminConsentUrl);
}
