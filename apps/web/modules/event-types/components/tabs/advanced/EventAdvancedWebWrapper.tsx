import { useSession } from "next-auth/react";

import { localeOptions } from "@calcom/lib/i18n";
import { UserPermissionRole } from "@calcom/prisma/enums";
import { trpc } from "@calcom/trpc/react";

import type { EventAdvancedBaseProps } from "./EventAdvancedTab";
import { EventAdvancedTab } from "./EventAdvancedTab";

const EventAdvancedWebWrapper = ({ ...props }: EventAdvancedBaseProps) => {
  const session = useSession();
  const isAdmin = session.data?.user.role === UserPermissionRole.ADMIN;
  const connectedCalendarsQuery =
    trpc.viewer.calendars.connectedCalendars.useQuery();
  const { data: verifiedEmails } =
    trpc.viewer.workflows.getVerifiedEmails.useQuery({
      teamId: props.team?.id,
    });
  return (
    <EventAdvancedTab
      {...props}
      calendarsQuery={{
        data: connectedCalendarsQuery.data,
        isPending: connectedCalendarsQuery.isPending,
        error: connectedCalendarsQuery.error,
      }}
      showBookerLayoutSelector={true}
      verifiedEmails={verifiedEmails}
      localeOptions={localeOptions}
      isAdmin={isAdmin}
    />
  );
};

export default EventAdvancedWebWrapper;
