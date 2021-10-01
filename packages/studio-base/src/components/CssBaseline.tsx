// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { mergeStyles, useTheme } from "@fluentui/react";
import { PropsWithChildren } from "react";

import robotoMonoBoldItalic from "@foxglove/studio-base/assets/latin-roboto-mono-bold-italic.woff2";
import robotoMonoBold from "@foxglove/studio-base/assets/latin-roboto-mono-bold.woff2";
import robotoMonoItalic from "@foxglove/studio-base/assets/latin-roboto-mono-italic.woff2";
import robotoMono from "@foxglove/studio-base/assets/latin-roboto-mono.woff2";
import { fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

const unicodeRange = `U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD`;

export default function CssBaseline(props: PropsWithChildren<unknown>): JSX.Element {
  const theme = useTheme();

  mergeStyles({
    ":global(@font-face)": {
      fontFamily: "Roboto Mono",
      fontStyle: "italic",
      fontWeight: 700,
      src: `url(${robotoMonoBoldItalic}) format("woff2")`,
      unicodeRange,
    },
  });

  mergeStyles({
    ":global(@font-face)": {
      fontFamily: "Roboto Mono",
      fontStyle: "normal",
      fontWeight: 700,
      src: `url(${robotoMonoBold}) format("woff2")`,
      unicodeRange,
    },
  });

  mergeStyles({
    ":global(@font-face)": {
      fontFamily: "Roboto Mono",
      fontStyle: "italic",
      fontWeight: 400,
      src: `url(${robotoMonoItalic}) format("woff2")`,
      unicodeRange,
    },
  });

  mergeStyles({
    ":global(@font-face)": {
      fontFamily: "Roboto Mono",
      fontStyle: "normal",
      fontWeight: 400,
      src: `url(${robotoMono}) format("woff2")`,
      unicodeRange,
    },
  });

  // styles scoped to our container
  const className = mergeStyles({
    "*,*:before,*:after": {
      boxSizing: "inherit",
    },
    "code, pre, tt": {
      fontFamily: fonts.MONOSPACE,
      overflowWrap: "break-word",
    },
    code: {
      padding: "0 0.25em",
      backgroundColor: theme.semanticColors.bodyBackgroundHovered,
      borderRadius: "0.2em",
    },
    div: {
      "::-webkit-scrollbar": {
        width: "4px",
        height: "4px",
      },
      "::-webkit-scrollbar-track": {
        background: "transparent",
      },
      "::-webkit-scrollbar-thumb": {
        background: "rgba(255, 255, 255, 0.1)",
        borderRadius: "2px",
      },
    },
    p: {
      margin: "1em 0",

      ":last-child": {
        marginBottom: 0,
      },
    },
    "b,strong": {
      fontWeight: "bolder",
    },
    table: {
      borderCollapse: "collapse",
      borderSpacing: 0,
    },
    "th, td": {
      textAlign: "left",
      verticalAlign: "top",
    },

    // container styling
    height: "100%",
    width: "100%",
    display: "flex",
    flexDirection: "column",
    position: "relative",
    flex: "1 1 100%",
    overflow: "hidden",
    background: theme.semanticColors.bodyBackground,
    color: theme.semanticColors.bodyText,
    font: "inherit",
    ...theme.fonts.small,
  });

  return <div className={className}>{props.children}</div>;
}
