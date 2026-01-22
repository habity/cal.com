import { useState } from "react";

import useAddAppMutation from "../../_utils/useAddAppMutation";
import type { InstallAppButtonProps } from "../../types";
import AccountDialog from "./AccountDialog";

export default function InstallAppButton(props: InstallAppButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Capture current URL when component renders - this is where we want to return after OAuth
  const returnToUrl =
    typeof window !== "undefined" ? window.location.href : undefined;
  const mutation = useAddAppMutation(null);
  const handleSubmit = () => {
    mutation.mutate({
      type: "office365_video",
      variant: "conferencing",
      slug: "msteams",
      returnTo: returnToUrl,
    });
  };

  return (
    <>
      {props.render({
        onClick() {
          setIsModalOpen(true);
        },
        disabled: isModalOpen,
      })}
      <AccountDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        handleSubmit={handleSubmit}
      />
    </>
  );
}
