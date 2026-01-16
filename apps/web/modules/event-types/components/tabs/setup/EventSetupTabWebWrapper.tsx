import { useSession } from "next-auth/react";

import { useOrgBranding } from "@calcom/features/ee/organizations/context/provider";
import { WEBSITE_URL } from "@calcom/lib/constants";
import { localeOptions } from "@calcom/lib/i18n";
import { UserPermissionRole } from "@calcom/prisma/enums";

import type { EventSetupTabProps } from "./EventSetupTab";
import { EventSetupTab } from "./EventSetupTab";

const EventSetupTabWebWrapper = (props: EventSetupTabProps) => {
  const orgBranding = useOrgBranding();
  const session = useSession();
  const urlPrefix = orgBranding
    ? orgBranding?.fullDomain.replace(/^(https?:|)\/\//, "")
    : `${WEBSITE_URL?.replace(/^(https?:|)\/\//, "")}`;
  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;
  return (
    <EventSetupTab
      urlPrefix={urlPrefix}
      hasOrgBranding={!!orgBranding}
      orgId={session.data?.user.org?.id}
      localeOptions={localeOptions}
      isAdmin={isAdmin}
      {...props}
    />
  );
};

export default EventSetupTabWebWrapper;
