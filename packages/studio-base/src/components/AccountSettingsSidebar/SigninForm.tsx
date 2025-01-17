// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PrimaryButton, Text, useTheme } from "@fluentui/react";
import { Stack } from "@mui/material";

import { useCurrentUser } from "@foxglove/studio-base/context/CurrentUserContext";

import AccountSyncGraphic from "./AccountSyncGraphic";

export default function SigninForm(): JSX.Element {
  const theme = useTheme();
  const { signIn } = useCurrentUser();

  return (
    <Stack spacing={2.5} sx={{ lineHeight: "1.3" }}>
      <Stack direction="row" justifyContent="center" sx={{ color: theme.palette.accent }}>
        <AccountSyncGraphic width={192} />
      </Stack>
      <Text variant="medium">
        Create a Foxglove account to sync your layouts across multiple devices, and share them with
        your team.
      </Text>

      <PrimaryButton
        text="Sign in"
        onClick={signIn}
        styles={{
          root: {
            marginLeft: 0,
            marginRight: 0,
          },
        }}
      />
    </Stack>
  );
}
