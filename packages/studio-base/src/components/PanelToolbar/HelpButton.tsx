// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { IconButton, useTheme } from "@fluentui/react";
import { PropsWithChildren, useState } from "react";

import HelpModal from "@foxglove/studio-base/components/HelpModal";
import { useTooltip } from "@foxglove/studio-base/components/Tooltip";

export default function HelpButton(props: PropsWithChildren): JSX.Element {
  const theme = useTheme();
  const [showHelp, setShowHelp] = useState<boolean>(false);

  const helpButton = useTooltip({
    contents: "Help",
  });

  return (
    <>
      {showHelp && (
        <HelpModal onRequestClose={() => setShowHelp(false)}>{props.children}</HelpModal>
      )}
      <IconButton
        elementRef={helpButton.ref}
        onClick={() => setShowHelp(true)}
        iconProps={{ iconName: "HelpCircle" }}
        styles={{
          icon: {
            color: theme.palette.neutralTertiary,

            svg: {
              fill: "currentColor",
              height: "1em",
              width: "1em",
            },
          },
        }}
      >
        {helpButton.tooltip}
      </IconButton>
    </>
  );
}
