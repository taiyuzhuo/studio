// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Box } from "@mui/material";
import { PropsWithChildren } from "react";

const RADIUS = 7;

export function Badge(props: PropsWithChildren<{ count?: number }>): JSX.Element {
  const { count } = props;

  return (
    <Box position="relative">
      {props.children}
      <Box
        sx={{
          position: "absolute",
          bottom: -RADIUS,
          right: -RADIUS,
          width: RADIUS * 2,
          height: RADIUS * 2,
          borderRadius: RADIUS,
          backgroundColor: "error.main",
          color: "rgba(255, 255, 255, 0.8)",
          fontSize: 8,
          fontWeight: 700,
          fontFeatureSettings: "normal",
          letterSpacing: "-0.025em",
          lineHeight: `${RADIUS * 2}px`,
          textAlign: "center",
        }}
      >
        {count == undefined ? "" : count}
      </Box>
    </Box>
  );
}
