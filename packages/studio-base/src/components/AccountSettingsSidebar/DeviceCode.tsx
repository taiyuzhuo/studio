// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Stack, Text, TextField, useTheme } from "@fluentui/react";
import { useEffect } from "react";

type DeviceCodePanelProps = {
  userCode: string;
  verificationUrl: string;
};

// Show instructions on opening the browser and entering the device code
export default function DeviceCode(props: DeviceCodePanelProps): JSX.Element {
  const theme = useTheme();
  const url = new URL(props.verificationUrl);
  url.searchParams.append("user_code", props.userCode);
  const href = url.toString();

  useEffect(() => {
    window.open(href, "_blank");
  }, [href]);

  return (
    <Stack tokens={{ childrenGap: theme.spacing.l1 }}>
      <Stack tokens={{ childrenGap: theme.spacing.s1 }} styles={{ root: { lineHeight: "1.3" } }}>
        <Text variant="medium" block>
          To connect your Foxglove account, follow the instructions in your browser.
        </Text>
        <Text variant="medium" block>
          If your browser didn’t open automatically, please <a href={href}>click here</a> to
          continue.
        </Text>
      </Stack>

      <TextField
        label="Your device confirmation code is:"
        value={props.userCode}
        autoFocus
        readOnly
        styles={{
          root: {
            textAlign: "center",
          },
          field: {
            fontSize: theme.fonts.xxLarge.fontSize,
            textAlign: "center",
          },
          fieldGroup: {
            marginTop: theme.spacing.s2,
            height: 48,
          },
        }}
      />
    </Stack>
  );
}
