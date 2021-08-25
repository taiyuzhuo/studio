// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { PrimaryButton, Stack, Text, Spinner, useTheme, SpinnerSize } from "@fluentui/react";
import { useCallback, useEffect } from "react";
import { useToasts } from "react-toast-notifications";
import { useAsync, useAsyncFn, useLocalStorage, useMountedState } from "react-use";

import Logger from "@foxglove/log";
import { useConsoleApi } from "@foxglove/studio-base/context/ConsoleApiContext";

import DeviceCode from "./DeviceCode";

const log = Logger.getLogger(__filename);

const AccountSyncGraphic = ({ width }: { width?: number }) => (
  <svg width={width} viewBox="0 0 256 256">
    <g stroke="currentColor">
      <path
        d="M122.63,54.19C103,70.22,90,97.21,90,128c0,22.77,7.08,43.54,18.73,59.3"
        fill="none"
        strokeLinecap="round"
        strokeWidth="4.5"
      />
      <path
        d="M133.32,201.82C153,185.8,166,158.81,166,128c0-22.35-6.82-42.78-18.09-58.43"
        fill="none"
        strokeLinecap="round"
        strokeWidth="4.5"
      />
      <path
        d="M181,170.16a101.44,101.44,0,0,0-53-14.45,102.52,102.52,0,0,0-47.9,11.56"
        fill="none"
        strokeLinecap="round"
        strokeWidth="4.5"
      />
      <path
        d="M76,87.42a101.64,101.64,0,0,0,52,13.87,102.12,102.12,0,0,0,49.85-12.63"
        fill="none"
        strokeLinecap="round"
        strokeWidth="4.5"
      />
      <path d="M128,54V202" fill="none" strokeWidth="4.5" />
      <path
        d="M192,165.16A74,74,0,0,0,93,62.78,40,40,0,0,1,62.78,93,74,74,0,0,0,164.44,192.4,40,40,0,0,1,192,165.16Z"
        fill="none"
        strokeWidth="4.5"
      />
    </g>

    <g fill="currentColor">
      <circle cx="119.46" cy="30.37" r="3" />
      <circle cx="102.64" cy="33.34" r="3" />
      <circle cx="33.34" cy="102.64" r="3" />
      <circle cx="30.37" cy="119.46" r="3" />
      <circle cx="30.37" cy="136.54" r="3" />
      <circle cx="33.34" cy="153.36" r="3" />
      <circle cx="39.18" cy="169.42" r="3" />
      <circle cx="47.72" cy="184.21" r="3" />
      <circle cx="58.7" cy="197.3" r="3" />
      <circle cx="71.79" cy="208.28" r="3" />
      <circle cx="86.58" cy="216.82" r="3" />
      <circle cx="102.64" cy="222.66" r="3" />
      <circle cx="119.46" cy="225.63" r="3" />
      <circle cx="136.54" cy="225.63" r="3" />
      <circle cx="153.36" cy="222.66" r="3" />
      <circle cx="222.66" cy="153.36" r="3" />
      <circle cx="225.63" cy="136.54" r="3" />
      <circle cx="225.63" cy="119.46" r="3" />
      <circle cx="222.66" cy="102.64" r="3" />
      <circle cx="216.82" cy="86.58" r="3" />
      <circle cx="208.28" cy="71.79" r="3" />
      <circle cx="197.3" cy="58.7" r="3" />
      <circle cx="184.21" cy="47.72" r="3" />
      <circle cx="169.42" cy="39.18" r="3" />
      <circle cx="153.36" cy="33.34" r="3" />
      <circle cx="136.54" cy="30.37" r="3" />
    </g>

    <g stroke="currentColor">
      <path
        d="M28.89,85.13l7.72-12.2a8,8,0,0,1,6.51-3.35H64.88a8,8,0,0,1,6.51,3.35l7.72,12.2"
        fill="none"
        strokeWidth="4.5"
      />
      <rect x="40" y="29.18" width="28" height="28" rx="7" fill="none" strokeWidth="4.5" />
      <circle cx="54" cy="54" r="40" fill="none" strokeWidth="4.5" />
    </g>

    <g stroke="currentColor">
      <path
        d="M177.71,234.79l7.72-12.2a8,8,0,0,1,6.51-3.35H213.7a8,8,0,0,1,6.51,3.35l7.71,12.2"
        fill="none"
        strokeWidth="4.5"
      />
      <rect x="188.82" y="178.84" width="28" height="28" rx="7" fill="none" strokeWidth="4.5" />
      <circle cx="202.82" cy="203.66" r="40" fill="none" strokeWidth="4.5" />
    </g>
  </svg>
);

export default function SigninForm(): JSX.Element {
  const theme = useTheme();
  const { addToast } = useToasts();
  const api = useConsoleApi();
  const isMounted = useMountedState();
  const [, setBearerToken] = useLocalStorage<string>("fox.bearer-token");
  const [, setIdToken] = useLocalStorage<string>("fox.id-token");

  const [{ value: deviceCode, error: deviceCodeError, loading }, getDeviceCode] =
    useAsyncFn(async () => {
      return await api.deviceCode({
        client_id: process.env.OAUTH_CLIENT_ID!,
      });
    }, [api]);

  const handleOnSigninClick = useCallback(() => {
    void getDeviceCode();
  }, [getDeviceCode]);

  useEffect(() => {
    if (deviceCodeError) {
      addToast(deviceCodeError.message, {
        appearance: "error",
      });
    }
  }, [addToast, deviceCodeError]);

  const { value: deviceResponse, error: deviceResponseError } = useAsync(async () => {
    if (!deviceCode) {
      return;
    }

    const endTimeMs = Date.now() + deviceCode.expires_in * 1000;

    // continue polling for the token until we receive the token or we timeout
    while (Date.now() < endTimeMs) {
      await new Promise((resolve) => setTimeout(resolve, deviceCode.interval * 1000));
      // no need to query if no longer mounted
      if (!isMounted()) {
        return;
      }

      try {
        const tempAccess = await api.token({
          device_code: deviceCode.device_code,
          client_id: process.env.OAUTH_CLIENT_ID!,
        });
        return tempAccess;
      } catch (err) {
        log.warn(err);
        // ignore and retry
      }
    }

    throw new Error("Timeout");
  }, [api, deviceCode, isMounted]);

  useEffect(() => {
    if (deviceResponseError) {
      addToast(deviceResponseError.message, {
        appearance: "error",
      });
    }
  }, [addToast, deviceResponseError]);

  useEffect(() => {
    if (!deviceResponse?.session) {
      return;
    }

    setBearerToken(deviceResponse.session.bearer_token);
    setIdToken(deviceResponse.id_token);
    window.location.reload();
  }, [deviceResponse, setBearerToken, setIdToken]);

  if (deviceResponse?.session) {
    return <div>Success!</div>;
  }

  if (deviceCode) {
    return (
      <DeviceCode userCode={deviceCode.user_code} verificationUrl={deviceCode.verification_uri} />
    );
  }

  return (
    <Stack tokens={{ childrenGap: theme.spacing.l1 }} styles={{ root: { lineHeight: "1.3" } }}>
      <Stack horizontal horizontalAlign="center" styles={{ root: { color: theme.palette.accent } }}>
        <AccountSyncGraphic width={192} />
      </Stack>
      <Text variant="mediumPlus">
        Sign in to access collaboration features like shared layouts.
      </Text>

      <PrimaryButton
        disabled={loading}
        text="Sign in"
        onClick={handleOnSigninClick}
        styles={{
          root: {
            marginLeft: 0,
            marginRight: 0,
          },
          rootDisabled: {
            cursor: "wait !important",
          },
        }}
      />
    </Stack>
  );
}
