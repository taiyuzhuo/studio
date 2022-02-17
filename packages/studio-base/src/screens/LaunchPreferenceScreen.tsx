// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { CompoundButton, Checkbox, Text, IButtonStyles } from "@fluentui/react";
import { Card, Stack, Theme } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { ReactElement, useState } from "react";

import { AppSetting } from "@foxglove/studio-base/AppSetting";
import { useAppConfigurationValue } from "@foxglove/studio-base/hooks";
import { useSessionStorageValue } from "@foxglove/studio-base/hooks/useSessionStorageValue";

const useStyles = makeStyles((theme: Theme) => ({
  root: {
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
  card: {
    gap: theme.spacing(2.5),
    padding: theme.spacing(4),
    marginBottom: theme.spacing(2.5),
    maxWidth: 480,
  },
  title: {
    textAlign: "center",
    marginBottom: theme.spacing(2),
  },
}));

const buttonStyles = {
  root: { flex: "0 1 100%" },
  flexContainer: { alignItems: "center" },
} as Partial<IButtonStyles>;

export function LaunchPreferenceScreen(): ReactElement {
  const classes = useStyles();

  const [globalPreference, setGlobalPreference] = useAppConfigurationValue<string | undefined>(
    AppSetting.LAUNCH_PREFERENCE,
  );
  const [_, setSessionPreference] = useSessionStorageValue(AppSetting.LAUNCH_PREFERENCE);
  const [rememberPreference, setRememberPreference] = useState(globalPreference != undefined);

  const cleanWebURL = new URL(window.location.href);
  cleanWebURL.searchParams.delete("launch");

  async function launchInWeb() {
    if (rememberPreference) {
      await setGlobalPreference("web");
    } else {
      setSessionPreference("web");
    }
  }

  async function launchInDesktop() {
    if (rememberPreference) {
      await setGlobalPreference("desktop");
    } else {
      setSessionPreference("desktop");
    }
  }

  async function toggleRememberPreference() {
    if (rememberPreference) {
      await setGlobalPreference(undefined);
    }

    setRememberPreference(!rememberPreference);
  }

  return (
    <Stack className={classes.root}>
      <Card variant="outlined" className={classes.card}>
        <Text className={classes.title} variant="xxLarge">
          Launch Foxglove Studio
        </Text>
        <Stack direction="row" spacing={2}>
          <CompoundButton
            styles={buttonStyles}
            onClick={() => void launchInWeb()}
            secondaryText="Requires Chrome v76+"
          >
            Web
          </CompoundButton>
          <CompoundButton
            styles={buttonStyles}
            onClick={() => void launchInDesktop()}
            secondaryText="For Linux, Windows, and macOS"
          >
            Desktop App
          </CompoundButton>
        </Stack>
        <Checkbox
          label="Remember my preference"
          checked={rememberPreference}
          onChange={toggleRememberPreference}
        />
      </Card>
    </Stack>
  );
}
