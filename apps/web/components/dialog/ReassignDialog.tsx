import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";

import type { Host } from "@calcom/ee/teams/components/TeamAssignList";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button, Dialog, DialogClose, DialogContent, DialogFooter, Label, Select } from "@calcom/ui";
import { RadioGroup as RadioArea } from "@calcom/ui";

type ReassignDialog = {
  isOpenDialog: boolean;
  setIsOpenDialog: Dispatch<SetStateAction<boolean>>;
  hosts?: Host[];
  assignedHosts: string[];
  eventTypeId: number;
  teamId: number;
  bookingId: number;
};

const MemberReassignStep = ({
  hosts,
  assignedHosts,
  setSelectedHost,
  selectedHost,
}: {
  hosts?: Host[];
  assignedHosts?: string[];
  setSelectedHost: Dispatch<SetStateAction<number>>;
  selectedHost: number;
}) => {
  const { t } = useLocale();

  const hostsToReassign = hosts?.filter(
    (host) => !assignedHosts?.find((assignedHost) => assignedHost === host.user.email && !host.isFixed)
  );

  const hostsToReassignOptions =
    hostsToReassign?.map((host) => {
      return { label: host.user.name || "", value: host.user.id };
    }) || [];

  // only show available hosts, backend work needed

  if (!hostsToReassignOptions) {
    return <div>{t("no_available_hosts")}</div>;
  }

  return (
    <div className="py-4">
      <Label>{t("assign_to")}</Label>
      <Select
        isSearchable={true}
        options={hostsToReassignOptions}
        onChange={(val) => {
          if (val) {
            setSelectedHost(val.value);
          }
        }}
        maxMenuHeight={200}
        defaultValue={hostsToReassignOptions[0]}
        value={hostsToReassignOptions.find((option) => option.value === selectedHost)}
      />
    </div>
  );
};

export const ReassignDialog = ({
  isOpenDialog,
  setIsOpenDialog,
  hosts,
  assignedHosts,
  eventTypeId,
  teamId,
  bookingId,
}: ReassignDialog) => {
  const { t } = useLocale();
  const [reassignTarget, setReassignTarget] = useState<"round-robin" | "choose-member">("round-robin");
  const [selectedHost, setSelectedHost] = useState(0);

  const roundRobinReassignMutation = trpc.viewer.teams.roundRobinReassign.useMutation();

  return (
    <Dialog
      open={isOpenDialog}
      onOpenChange={(open) => {
        setIsOpenDialog(open);
      }}>
      <DialogContent title={t("reassign_reound_robin_host")}>
        <RadioArea.Group className="mt-3 flex flex-col space-y-4">
          <RadioArea.Item
            className="text-sm"
            checked={reassignTarget === "round-robin"}
            value="round-robin"
            onClick={() => setReassignTarget("round-robin")}>
            <strong className="mb-1">{t("round_robin")}</strong>
            <p>{t("reassign_to_another_rr_host")}</p>
          </RadioArea.Item>
          <RadioArea.Item
            className="text-sm"
            value="choose-member"
            checked={reassignTarget === "choose-member"}
            onClick={() => setReassignTarget("choose-member")}>
            <strong className="mb-1">{t("assign_team_member")}</strong>
            <p>{t("override_team_member_to_assign")}</p>
          </RadioArea.Item>
        </RadioArea.Group>
        {reassignTarget === "choose-member" ? (
          <MemberReassignStep
            setSelectedHost={setSelectedHost}
            selectedHost={selectedHost}
            hosts={hosts}
            assignedHosts={assignedHosts}
          />
        ) : (
          <></>
        )}
        <DialogFooter>
          <DialogClose />
          <Button
            data-testid="rejection-confirm"
            onClick={() => {
              if (reassignTarget === "round-robin") {
                roundRobinReassignMutation.mutate({ teamId, eventTypeId, bookingId });
                //assign to the least recently booked available rr host, backend work needed
              } else {
                // assign to selected host, backend work needed
              }
              // setIsOpenDialog(false);
            }}>
            {t("reassign")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};