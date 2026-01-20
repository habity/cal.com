import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Callback endpoint for Microsoft admin consent flow
 * GET /api/admin-consent/outlook/callback
 *
 * Query params from Microsoft:
 * - admin_consent: "True" if consent was granted
 * - tenant: The tenant ID that granted consent
 * - state: The state parameter passed in the original request (if any)
 * - error: Error code if consent failed
 * - error_description: Error description if consent failed
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { admin_consent, tenant, error, error_description } = req.query;

  if (error) {
    return res.status(400).json({
      success: false,
      error: {
        code: error,
        description: error_description,
      },
    });
  }

  if (admin_consent === "True") {
    // Admin consent was granted successfully
    // You can now use this tenant_id to configure delegation credentials
    return res.status(200).json({
      success: true,
      message: "Admin consent granted successfully",
      tenant_id: tenant,
      next_steps: [
        "Use this tenant_id to configure Cal.com delegation credentials",
        "POST /v2/organizations/:orgId/delegation-credentials with the tenant_id and client credentials",
      ],
    });
  }

  return res.status(400).json({
    success: false,
    error: {
      code: "consent_not_granted",
      description: "Admin consent was not granted",
    },
  });
}
