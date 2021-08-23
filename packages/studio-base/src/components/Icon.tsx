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

import { mergeStyleSets } from "@fluentui/react";
import cx from "classnames";
import { CSSProperties } from "react";

import Tooltip, { useTooltip } from "@foxglove/studio-base/components/Tooltip";
import { colors } from "@foxglove/studio-base/util/sharedStyleConstants";

// import styles from "./icon.module.scss";

type Props = {
  children: React.ReactNode;
  xlarge?: boolean;
  large?: boolean;
  medium?: boolean;
  small?: boolean;
  xsmall?: boolean;
  xxsmall?: boolean;
  active?: boolean;
  fade?: boolean;
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  clickable?: boolean;
  className?: string;
  style?: CSSProperties;
  tooltip?: React.ReactNode;
  tooltipProps?: Partial<React.ComponentProps<typeof Tooltip> & { alwaysShown?: false }>;
  dataTest?: string;
};

const styles = mergeStyleSets({
  icon: {
    verticalAlign: "middle",

    img: {
      fontSize: "inherit",
      verticalAlign: "middle",
    },
    "& > svg": {
      fill: "currentColor",
      width: "1em",
      height: "1em",
      verticalAlign: "text-top",
    },
  },
  fade: {
    opacity: 0.6,
    transition: "opacity 0.2s ease-in-out",

    "&:hover": {
      opacity: 0.8,
    },
    "&.active": {
      opacity: 1,
    },
  },
  wrappedIcon: {
    display: "block",
    padding: "10px",
    minHeight: "40px",
    minWidth: "40px",

    "&:hover": {
      backgroundColor: colors.DARK3,
    },
    "&.active": {
      backgroundColor: colors.DARK4,
    },
  },
  clickable: {
    cursor: "pointer",
  },
  xlarge: {
    width: 32,
    height: 32,
    fontSize: 32,

    img: {
      width: 32,
      height: 32,
    },
  },
  large: {
    width: 24,
    height: 24,
    fontSize: 24,

    img: {
      width: 24,
      height: 24,
    },
  },
  medium: {
    width: 20,
    height: 20,
    fontSize: 20,

    img: {
      width: 20,
      height: 20,
    },
  },
  small: {
    width: 18,
    height: 18,
    fontSize: 18,

    img: {
      width: 18,
      height: 18,
    },
  },
  xsmall: {
    width: 16,
    height: 16,
    fontSize: 16,

    img: {
      width: 16,
      height: 16,
    },
  },
  xxsmall: {
    width: 11,
    height: 11,
    fontSize: 11,

    img: {
      width: 11,
      height: 11,
    },
  },
});

const Icon = (props: Props): JSX.Element => {
  const {
    children,
    xlarge,
    large,
    medium,
    small,
    xsmall,
    xxsmall,
    onClick,
    clickable,
    active,
    fade,
    className,
    style,
    tooltip,
    tooltipProps,
    dataTest,
  } = props;
  const conditionalClasses = {
    [styles.fade]: fade,
    [styles.clickable]: !!onClick || clickable == undefined || clickable,
    [styles.xlarge]: xlarge,
    [styles.large]: large,
    [styles.medium]: medium,
    [styles.small]: small,
    [styles.xsmall]: xsmall,
    [styles.xxsmall]: xxsmall,
    active,
  };

  // if we have a click handler
  // cancel the bubbling on the event and process it
  // in our click handler callback; otherwise, let it bubble
  const clickHandler = (e: React.MouseEvent<HTMLElement>) => {
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick(e);
    }
  };

  const { ref: tooltipRef, tooltip: tooltipNode } = useTooltip({
    contents: tooltip,
    ...tooltipProps,
  });

  return (
    <span
      ref={tooltipRef}
      className={cx("icon", styles.icon, className, conditionalClasses)}
      onClick={clickHandler}
      style={style}
      data-test={dataTest}
    >
      {children}
      {tooltipNode}
    </span>
  );
};

Icon.displayName = "Icon";

export const WrappedIcon = (props: Props): JSX.Element => {
  return (
    <Icon {...props} style={props.style} className={cx(styles.wrappedIcon, props.className)} />
  );
};

WrappedIcon.displayName = "Icon";

export default Icon;
