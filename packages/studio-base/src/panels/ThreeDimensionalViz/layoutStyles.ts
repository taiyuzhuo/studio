// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { mergeStyleSets } from "@fluentui/react";

import { colors } from "@foxglove/studio-base/util/sharedStyleConstants";

const spacing = 15;

export default mergeStyleSets({
  // container for the entire panel
  container: {
    display: "flex",
    flex: "1 1 auto",
    position: "relative",
    width: "100%",
    height: "100%",
  },
  world: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  topicSettingsEditor: {
    borderRadius: 4,
    boxShadow: "0 0px 32px rgba(8, 8, 10, 0.6)",
    overflow: "hidden",
    pointerEvents: "auto",
    flexShrink: 0,
    backgroundColor: colors.DARK,
    width: 360,
    padding: 20,
  },
  closeIcon: {
    position: "absolute",
    right: 7,
    top: 7,
    cursor: "pointer",
    fontSize: 16,
  },
  toolbar: {
    position: "absolute",
    top: spacing + 20,
    right: spacing,
    padding: 0,
    zIndex: "101",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    // allow mouse events to pass through the empty space in this container element
    pointerEvents: "none",
  },
  iconButton: {
    backgroundColor: "transparent",
    border: "none",
    padding: "8px 4px",
    alignItems: "start",
    marginRight: 4,
    marginLeft: 4,
  },
  button: {
    backgroundColor: "transparent !important",
    border: "none",
    padding: "4px !important",
    alignItems: "start",
    marginRight: "4px !important",
    marginLeft: "4px !important",
  },
  buttons: {
    backgroundColor: colors.DARK3,
    borderRadius: 4,
    padding: 0,
    boxShadow: "0 0px 32px rgba(8, 8, 10, 0.6)",
    overflow: "hidden",
    pointerEvents: "auto",
    flexShrink: "0",
    display: "flex",
    flexDirection: "column",
    marginBottom: 10,

    "& .icon": {
      width: 18,
      height: 18,
      fontSize: 18,
      display: "inline-block",
    },
  },
  buttonsActive: {
    "& .icon": {
      color: colors.ACCENT,
    },
  },
  cameraWarning: {
    marginTop: "0.5em",
    fontSize: "0.9em",
    fontStyle: "italic",
    color: colors.TEXT_MUTED,

    // don't affect flex parent width
    // https://stackoverflow.com/a/25045641/23649
    width: 0,
    minWidth: "100%",
  },
  cartographer: {
    padding: 0,

    "& button": {
      width: 31,
      height: 36,
      margin: 0,
    },
  },
});
