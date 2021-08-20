// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PrimaryButton, Stack, useTheme } from "@fluentui/react";
import { useCallback } from "react";
import { useLocalStorage } from "react-use";

import Logger from "@foxglove/log";
import { useConsoleApi } from "@foxglove/studio-base/context/ConsoleApiContext";
import { IdToken } from "@foxglove/studio-base/services/ConsoleApi";

const log = Logger.getLogger(__filename);

export default function AccountInfo(props: { me?: IdToken }): JSX.Element {
  const theme = useTheme();
  const api = useConsoleApi();
  const [, , removeBearerToken] = useLocalStorage<string>("fox.bearer-token");
  const [, , removeIdToken] = useLocalStorage<string>("fox.id-token");

  const onSignoutClick = useCallback(async () => {
    api.signout().catch((err) => {
      log.error(err);
    });
    removeBearerToken();
    removeIdToken();
    window.location.reload();
  }, [api, removeBearerToken, removeIdToken]);

  if (!props.me) {
    return <></>;
  }

  return (
    <Stack tokens={{ childrenGap: theme.spacing.s1 }}>
      <h1>{props.me.name}</h1>
      <div>{props.me.email}</div>
      <div>{props.me["https://api.foxglove.dev/org_slug"]}</div>
      <img src={props.me.picture} width={50} height={50} />
      <PrimaryButton onClick={onSignoutClick}>Signout</PrimaryButton>
    </Stack>
  );
}
