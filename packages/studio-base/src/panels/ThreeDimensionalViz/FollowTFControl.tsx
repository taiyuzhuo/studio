// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { IButtonStyles, IconButton, Stack, useTheme } from "@fluentui/react";
import { memo, useCallback, useMemo } from "react";

import { useTooltip } from "@foxglove/studio-base/components/Tooltip";
import { colors } from "@foxglove/studio-base/util/sharedStyleConstants";

type Props = {
  tfToFollow?: string;
  followOrientation: boolean;
  // eslint-disable-next-line @foxglove/no-boolean-parameters
  onFollowChange: (tfId?: string | false, followOrientation?: boolean) => void;
};

const FollowTFControl = memo<Props>(function FollowTFControl(props: Props) {
  const { tfToFollow, followOrientation, onFollowChange } = props;
  const theme = useTheme();

  const iconButtonStyles = useMemo(
    (): Partial<IButtonStyles> => ({
      rootHovered: { backgroundColor: "transparent" },
      rootPressed: { backgroundColor: "transparent" },
      rootDisabled: { backgroundColor: "transparent" },
      rootChecked: { backgroundColor: "transparent" },
      rootCheckedHovered: { backgroundColor: "transparent" },
      rootCheckedPressed: { backgroundColor: "transparent" },
      iconChecked: { color: colors.HIGHLIGHT },
      icon: {
        color: theme.semanticColors.bodyText,

        svg: {
          fill: "currentColor",
          height: "1em",
          width: "1em",
        },
      },
    }),
    [theme],
  );

  const getFollowButtonTooltip = useCallback(() => {
    // fixme - the behavior here is if no follow tf is set, then
    // we need to show tooltip indicating we can follow the selected render frame
    if (!tfToFollow) {
      return `Follow ${tfToFollow}`;
    } else if (!followOrientation) {
      return "Follow Orientation";
    }
    return "Unfollow";
  }, [tfToFollow, followOrientation]);

  const onClickFollowButton = useCallback(() => {
    if (!tfToFollow) {
      // disable button
      //return onFollowChange(getDefaultFollowTransformFrame());
    } else if (!followOrientation) {
      return onFollowChange(tfToFollow, true);
    }
    return onFollowChange(false);
  }, [tfToFollow, onFollowChange, followOrientation]);

  const followButtonTooltip = useTooltip({ contents: getFollowButtonTooltip() });

  return (
    <Stack
      horizontal
      verticalAlign="center"
      styles={{
        root: {
          pointerEvents: "auto",
          backgroundColor: theme.semanticColors.buttonBackgroundHovered,
          borderRadius: theme.effects.roundedCorner2,
          position: "relative",
        },
      }}
    >
      {followButtonTooltip.tooltip}
      <IconButton
        checked={tfToFollow != undefined}
        elementRef={followButtonTooltip.ref}
        onClick={onClickFollowButton}
        iconProps={{ iconName: followOrientation ? "CompassOutline" : "CrosshairsGps" }}
        styles={iconButtonStyles}
      />
    </Stack>
  );
});

export default FollowTFControl;
