import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { UserPermissionRole } from "@calcom/prisma/enums";

import { buildLegacyRequest } from "@lib/buildLegacyCtx";

export default async function BillingLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });

  if (!session?.user?.id) {
    redirect("/auth/login");
  }

  if (session.user.role !== UserPermissionRole.ADMIN) {
    redirect("/settings/my-account/profile");
  }

  return <>{children}</>;
}
