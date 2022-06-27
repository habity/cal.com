import { LightningBoltIcon } from "@heroicons/react/outline";
import { DotsHorizontalIcon, PencilIcon, TrashIcon, CalendarIcon } from "@heroicons/react/solid";
import Link from "next/link";
import { useState } from "react";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import showToast from "@calcom/lib/notification";
import { Button, Tooltip } from "@calcom/ui";
import { Dialog } from "@calcom/ui/Dialog";
import Dropdown, { DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@calcom/ui/Dropdown";
import EmptyScreen from "@calcom/ui/EmptyScreen";

import { withQuery } from "@lib/QueryCell";
import { HttpError } from "@lib/core/http/error";
import { inferQueryOutput, trpc } from "@lib/trpc";

import Shell from "@components/Shell";
import SkeletonLoader from "@components/availability/SkeletonLoader";
import ConfirmationDialogContent from "@components/dialog/ConfirmationDialogContent";
import { NewWorkflowButton } from "@components/workflows/NewWorkflowButton";

const WithQuery = withQuery(["viewer.workflows.list"]);

export default function Workflows() {
  const { t } = useLocale();

  return (
    <>
      <Shell
        heading={t("workflows")}
        subtitle={t("workflows_to_automate_notifications")}
        CTA={<NewWorkflowButton />}>
        <WithQuery
          success={({ data }) =>
            data.workflows.length !== 0 ? <WorkflowList {...data} /> : <CreateFirstWorkflowView />
          }
          customLoader={<SkeletonLoader />}
        />
      </Shell>
    </>
  );
}

const CreateFirstWorkflowView = () => {
  const { t } = useLocale();

  return (
    <EmptyScreen
      Icon={LightningBoltIcon}
      headline={t("new_workflow_heading")}
      description={t("new_workflow_description")}
    />
  );
};

export const WorkflowList = ({ workflows }: inferQueryOutput<"viewer.workflows.list">): JSX.Element => {
  const { t } = useLocale();
  const utils = trpc.useContext();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteDialogTypeId, setDeleteDialogTypeId] = useState(0);

  const deleteMutation = trpc.useMutation("viewer.workflows.delete", {
    onSuccess: async () => {
      await utils.invalidateQueries(["viewer.workflows.list"]);
      showToast(t("workflow_deleted_successfully"), "success");
      setDeleteDialogOpen(false);
    },
    onError: (err) => {
      if (err instanceof HttpError) {
        const message = `${err.statusCode}: ${err.message}`;
        showToast(message, "error");
        setDeleteDialogOpen(false);
      }
    },
  });

  async function deleteWorkflowHandler(id: number) {
    const payload = { id };
    deleteMutation.mutate(payload);
  }

  return (
    <div className="-mx-4 mb-16 overflow-hidden rounded-sm border border-gray-200 bg-white sm:mx-0">
      <ul className="divide-y divide-neutral-200">
        {workflows.map((workflow) => (
          <li key={workflow.id}>
            <div className="first-line:group flex w-full items-center justify-between px-4 py-4 hover:bg-neutral-50 sm:px-6">
              <Link href={"/workflows/" + workflow.id}>
                <a className="flex-grow cursor-pointer">
                  <div className="rtl:space-x-reverse">
                    <div className="max-w-56 truncate text-sm font-medium leading-6 text-neutral-900 md:max-w-max">
                      {workflow.name}
                    </div>
                    <ul className="mt-2 flex flex-wrap text-sm text-neutral-500 sm:flex-nowrap">
                      <li className="mb-1 mr-4 flex min-w-[265px] items-center truncate whitespace-nowrap">
                        <span className="mr-1">{`${t("triggers")}`}</span>
                        {workflow.timeUnit && workflow.time && (
                          <span className="mr-1">
                            {t(`${workflow.timeUnit.toLowerCase()}`, { count: workflow.time })}
                          </span>
                        )}
                        <span>{t(`${workflow.trigger.toLowerCase()}_trigger`)}</span>
                      </li>
                      <li className="mb-1 mr-4 flex min-w-[11rem] items-center whitespace-nowrap">
                        <CalendarIcon className="mr-1.5 inline h-4 w-4 text-neutral-400" aria-hidden="true" />
                        {workflow.activeOn && workflow.activeOn.length > 0 ? (
                          <Tooltip
                            content={workflow.activeOn.map((activeOn, key) => (
                              <p key={key}>{activeOn.eventType.title}</p>
                            ))}>
                            <span>{`Active on ${workflow.activeOn.length} event types`}</span>
                          </Tooltip>
                        ) : (
                          <>Not active</>
                        )}
                      </li>
                    </ul>
                  </div>
                </a>
              </Link>
              <div className="mr-5 flex flex-shrink-0">
                <div className="flex justify-between space-x-2 rtl:space-x-reverse">
                  <Dropdown>
                    <DropdownMenuTrigger className="h-10 w-10 cursor-pointer rounded-sm border border-transparent text-neutral-500 hover:border-gray-300 hover:text-neutral-900 focus:border-gray-300">
                      <DotsHorizontalIcon className="h-5 w-5 group-hover:text-gray-800" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem>
                        <Link href={"/workflows/" + workflow.id} passHref={true}>
                          <Button
                            type="button"
                            size="sm"
                            color="minimal"
                            className="w-full rounded-none"
                            StartIcon={PencilIcon}>
                            {t("edit")}
                          </Button>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Button
                          onClick={() => {
                            setDeleteDialogOpen(true);
                            setDeleteDialogTypeId(workflow.id);
                          }}
                          color="warn"
                          size="sm"
                          StartIcon={TrashIcon}
                          className="w-full rounded-none">
                          {t("delete")}
                        </Button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </Dropdown>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <ConfirmationDialogContent
          isLoading={deleteMutation.isLoading}
          variety="danger"
          title={t("delete_workflow")}
          confirmBtnText={t("confirm_delete_workflow")}
          loadingText={t("confirm_delete_workflow")}
          onConfirm={(e) => {
            e.preventDefault();
            deleteWorkflowHandler(deleteDialogTypeId);
          }}>
          {t("delete_workflow_description")}
        </ConfirmationDialogContent>
      </Dialog>
    </div>
  );
};
