import type { InstallAppButtonProps } from "@calcom/app-store/types";

import useAddAppMutation from "../../_utils/useAddAppMutation";
import appConfig from "../config.json";

export default function InstallAppButton(props: InstallAppButtonProps) {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-ignore
  const mutation = useAddAppMutation(appConfig.slug);

  return (
    <>
      {props.render({
        onClick() {
          mutation.mutate("");
        },
        loading: mutation.isLoading,
      })}
    </>
  );
}
