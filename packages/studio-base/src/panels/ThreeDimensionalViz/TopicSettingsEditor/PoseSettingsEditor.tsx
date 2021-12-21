// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2020-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { FormControl, FormLabel, OutlinedInput, Stack } from "@mui/material";

import ColorPicker from "@foxglove/studio-base/components/ColorPicker";
import { Color, PoseStamped } from "@foxglove/studio-base/types/Messages";
import { colors } from "@foxglove/studio-base/util/sharedStyleConstants";

import { TopicSettingsEditorProps } from ".";

export type PoseSettings = {
  overrideColor?: Color;
  alpha?: number;
  size?: {
    headLength?: number;
    headWidth?: number;
    shaftWidth?: number;
  };
};

export default function PoseSettingsEditor(
  props: TopicSettingsEditorProps<PoseStamped, PoseSettings>,
): JSX.Element {
  const { message, settings, onFieldChange, onSettingsChange } = props;

  if (!message) {
    return (
      <div style={{ color: colors.TEXT_MUTED }}>
        <small>Waiting for messages...</small>
      </div>
    );
  }

  const currentShaftWidth = settings.size?.shaftWidth ?? 2;
  const currentHeadWidth = settings.size?.headWidth ?? 2;
  const currentHeadLength = settings.size?.headLength ?? 0.1;

  return (
    <Stack spacing={2}>
      <FormControl>
        <FormLabel>Color</FormLabel>
        <ColorPicker
          color={settings.overrideColor}
          onChange={(newColor) => onFieldChange("overrideColor", newColor)}
          alphaType="alpha"
        />
      </FormControl>
      <FormControl>
        <FormLabel>Shaft width</FormLabel>
        <OutlinedInput
          type="number"
          value={currentShaftWidth}
          placeholder="2"
          size="small"
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              size: { ...settings.size, shaftWidth: parseFloat(e.target.value) },
            })
          }
        />
      </FormControl>
      <FormControl>
        <FormLabel>Head width</FormLabel>
        <OutlinedInput
          type="number"
          value={currentHeadWidth}
          placeholder="2"
          size="small"
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              size: { ...settings.size, headWidth: parseFloat(e.target.value) },
            })
          }
        />
      </FormControl>
      <FormControl>
        <FormLabel>Head length</FormLabel>
        <OutlinedInput
          type="number"
          value={currentHeadLength}
          placeholder="0.1"
          size="small"
          onChange={(e) =>
            onSettingsChange({
              ...settings,
              size: { ...settings.size, headLength: parseFloat(e.target.value) },
            })
          }
        />
      </FormControl>
    </Stack>
  );
}

PoseSettingsEditor.canEditNamespaceOverrideColor = true;
