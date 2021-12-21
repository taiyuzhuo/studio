// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2019-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { FormControl, FormLabel, MenuItem, OutlinedInput, Select, Stack } from "@mui/material";

export default function CommonPointSettings({
  defaultPointSize,
  defaultPointShape = "circle",
  settings,
  onFieldChange,
}: {
  defaultPointSize: number;
  defaultPointShape?: string;
  settings: {
    pointSize?: number;
    pointShape?: string;
  };
  onFieldChange: (name: string, value: unknown) => void;
}): JSX.Element {
  const pointSizeVal = settings.pointSize == undefined ? "" : settings.pointSize;

  const pointShape = settings.pointShape;
  const pointShapeVal = pointShape ?? defaultPointShape;

  return (
    <Stack direction="row" spacing={2}>
      <FormControl fullWidth>
        <FormLabel>Point Size</FormLabel>
        <OutlinedInput
          data-test="point-size-input"
          type="number"
          size="small"
          placeholder={defaultPointSize.toString()}
          value={pointSizeVal}
          inputProps={{ min: 1, max: 50, step: 1 }}
          onChange={(e) => {
            const isInputValid = !isNaN(parseFloat(e.target.value));
            onFieldChange("pointSize", isInputValid ? parseFloat(e.target.value) : undefined);
          }}
        />
      </FormControl>

      <FormControl fullWidth>
        <FormLabel>Point Shape</FormLabel>
        <Select
          value={pointShapeVal}
          size="small"
          onChange={(event) => onFieldChange("pointShape", event.target.value)}
        >
          <MenuItem value="circle">Circle</MenuItem>
          <MenuItem value="square">Square</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}
