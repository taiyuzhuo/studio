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
import markerArray from "./markerArray.ts.template";
import multipleInputs from "./multipleInputs.ts.template";
import skeleton from "./skeleton.ts.template";

export default [
  {
    name: "Markers",
    description: "A node that publishes one or more markers",
    template: markerArray,
  },
  {
    name: "Multiple Inputs",
    description: "A node that receives inputs on multiple topics",
    template: multipleInputs,
  },
  {
    name: "Skeleton",
    description: "An empty node script",
    template: skeleton,
  },
];
