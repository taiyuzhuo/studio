// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import jwtDecode from "jwt-decode";
import { PropsWithChildren, useEffect } from "react";
import { useAsync, useLocalStorage } from "react-use";

import Logger from "@foxglove/log";
import CurrentUserContext from "@foxglove/studio-base/context/CurrentUserContext";
import { IdToken } from "@foxglove/studio-base/services/ConsoleApi";
import { isNonEmptyOrUndefined } from "@foxglove/studio-base/util/emptyOrUndefined";

const log = Logger.getLogger(__filename);

/**
 * CurrentUserProvider attempts to load the current user's profile if there is an authenticated
 * session
 */
export default function CurrentUserProvider(props: PropsWithChildren<unknown>): JSX.Element {
  const [idToken] = useLocalStorage<string>("fox.id-token");

  const { loading, value, error } = useAsync(async () => {
    if (!isNonEmptyOrUndefined(idToken)) {
      return undefined;
    }

    return jwtDecode<IdToken>(idToken);
  }, [idToken]);

  useEffect(() => {
    if (error) {
      log.error(error);
    }
  }, [error]);

  if (loading) {
    return <></>;
  }

  return <CurrentUserContext.Provider value={value}>{props.children}</CurrentUserContext.Provider>;
}
