// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { createContext, useContext } from "react";

import { IdToken } from "@foxglove/studio-base/services/ConsoleApi";

const CurrentUserContext = createContext<IdToken | undefined>(undefined);

export function useCurrentUser(): IdToken | undefined {
  return useContext(CurrentUserContext);
}

export default CurrentUserContext;
