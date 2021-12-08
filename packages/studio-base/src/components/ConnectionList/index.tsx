// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  ActionButton,
  Icon,
  IconButton,
  Stack,
  Text,
  makeStyles,
  useTheme,
  TextField,
} from "@fluentui/react";
import { useCallback, useContext } from "react";

import { subtract as subtractTimes, toSec } from "@foxglove/rostime";
import EmptyState from "@foxglove/studio-base/components/EmptyState";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import NotificationModal from "@foxglove/studio-base/components/NotificationModal";
import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import { SidebarContent } from "@foxglove/studio-base/components/SidebarContent";
import ModalContext from "@foxglove/studio-base/context/ModalContext";
import {
  IDataSourceFactory,
  usePlayerSelection,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { useConfirm } from "@foxglove/studio-base/hooks/useConfirm";
import Timestamp from "@foxglove/studio-base/panels/SourceInfo/Timestamp";
import { PlayerPresence, PlayerProblem } from "@foxglove/studio-base/players/types";
import { formatDuration } from "@foxglove/studio-base/util/formatTime";
import { colors, fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

const selectPlayerPresence = ({ playerState }: MessagePipelineContext) => playerState.presence;
const selectPlayerProblems = (ctx: MessagePipelineContext) => ctx.playerState.problems;
const selectPlayerName = (ctx: MessagePipelineContext) => ctx.playerState.name;

const emptyArray: PlayerProblem[] = [];

const useStyles = makeStyles((theme) => ({
  badge: {
    textTransform: "uppercase",
    fontSize: theme.fonts.small.fontSize,
    fontWeight: 600,
    backgroundColor: theme.palette.themePrimary,
    color: theme.palette.neutralLighterAlt,
    padding: `1px 8px`,
    marginLeft: "10px",
    borderRadius: 100,
  },
}));

export default function ConnectionList(): JSX.Element {
  const { selectSource, availableSources } = usePlayerSelection();
  const confirm = useConfirm();
  const modalHost = useContext(ModalContext);
  const classes = useStyles();

  const playerProblems = useMessagePipeline(selectPlayerProblems) ?? emptyArray;
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const playerName = useMessagePipeline(selectPlayerName);

  const startTime = useMessagePipeline(
    useCallback((ctx) => ctx.playerState.activeData?.startTime, []),
  );
  const endTime = useMessagePipeline(useCallback((ctx) => ctx.playerState.activeData?.endTime, []));

  const theme = useTheme();

  const onSourceClick = useCallback(
    (source: IDataSourceFactory) => {
      if (source.disabledReason != undefined) {
        void confirm({
          title: "Unsupported connection",
          prompt: source.disabledReason,
          variant: "primary",
          cancel: false,
        });
        return;
      }

      selectSource(source.id);
    },
    [confirm, selectSource],
  );

  const showProblemModal = useCallback(
    (problem: PlayerProblem) => {
      const remove = modalHost.addModalElement(
        <NotificationModal
          notification={{
            message: problem.message,
            subText: problem.tip,
            details: problem.error,
            severity: problem.severity,
          }}
          onRequestClose={() => remove()}
        />,
      );
    },
    [modalHost],
  );

  const content =
    playerPresence === PlayerPresence.NOT_PRESENT ? (
      <>
        <Text>Not connected. Choose a data source below to get started.</Text>

        {availableSources.map((source) => {
          if (source.hidden === true) {
            return ReactNull;
          }

          const iconName: RegisteredIconNames = source.iconName as RegisteredIconNames;
          return (
            <div key={source.id}>
              <ActionButton
                styles={{
                  root: {
                    margin: 0,
                    padding: 0,
                    width: "100%",
                    textAlign: "left",
                    // sources with a disabled reason are clickable to show the reason
                    // a lower opacity makes the option look disabled to avoid drawing attention
                    opacity: source.disabledReason != undefined ? 0.5 : 1,
                  },
                }}
                iconProps={{
                  iconName,
                  styles: { root: { "& span": { verticalAlign: "baseline" } } },
                }}
                onClick={() => onSourceClick(source)}
              >
                {source.displayName}
                {source.badgeText && <span className={classes.badge}>{source.badgeText}</span>}
              </ActionButton>
            </div>
          );
        })}
      </>
    ) : (
      <>
        <Stack tokens={{ childrenGap: theme.spacing.m }}>
          <Stack
            tokens={{
              childrenGap: theme.spacing.m,
            }}
            styles={{
              root: {
                whiteSpace: "nowrap",
                overflow: "hidden",
              },
            }}
          >
            <Stack horizontal verticalAlign="center">
              <Stack grow tokens={{ childrenGap: theme.spacing.s2 }}>
                <Text
                  variant="medium"
                  styles={{
                    root: {
                      fontVariant: "small-caps",
                      textTransform: "lowercase",
                      color: theme.palette.neutralSecondaryAlt,
                      letterSpacing: "0.5px",
                      position: "sticky",
                      top: 0,
                    },
                  }}
                >
                  Current Connection
                </Text>
                <Text styles={{ root: { color: theme.palette.neutralSecondary } }}>
                  {playerName}
                </Text>
              </Stack>
            </Stack>

            <Stack tokens={{ childrenGap: theme.spacing.s2 }}>
              <Text
                variant="medium"
                styles={{
                  root: {
                    fontVariant: "small-caps",
                    textTransform: "lowercase",
                    color: theme.palette.neutralSecondaryAlt,
                    letterSpacing: "0.5px",
                  },
                }}
              >
                Start time
              </Text>
              {startTime ? (
                <Timestamp time={startTime} />
              ) : (
                <Text variant="small">Waiting for data…</Text>
              )}
            </Stack>

            <Stack tokens={{ childrenGap: theme.spacing.s2 }}>
              <Text
                variant="medium"
                styles={{
                  root: {
                    fontVariant: "small-caps",
                    textTransform: "lowercase",
                    color: theme.palette.neutralSecondaryAlt,
                    letterSpacing: "0.5px",
                  },
                }}
              >
                End time
              </Text>
              {endTime ? (
                <Timestamp time={endTime} />
              ) : (
                <Text variant="small">Waiting for data…</Text>
              )}
            </Stack>

            <Stack tokens={{ childrenGap: theme.spacing.s2 }}>
              <Text
                variant="medium"
                styles={{
                  root: {
                    fontVariant: "small-caps",
                    textTransform: "lowercase",
                    color: theme.palette.neutralSecondaryAlt,
                    letterSpacing: "0.5px",
                  },
                }}
              >
                Duration
              </Text>
              <Text
                variant="small"
                styles={{
                  root: {
                    fontFamily: fonts.MONOSPACE,
                    color: theme.palette.neutralSecondary,
                  },
                }}
              >
                {startTime && endTime
                  ? formatDuration(subtractTimes(endTime, startTime))
                  : "Waiting for data…"}
              </Text>
            </Stack>
          </Stack>
        </Stack>

        {playerProblems.length > 0 && (
          <hr
            style={{ width: "100%", height: "1px", border: 0, backgroundColor: colors.DIVIDER }}
          />
        )}
        {playerProblems.map((problem, idx) => {
          const iconName = problem.severity === "error" ? "Error" : "Warning";
          const color =
            problem.severity === "error"
              ? theme.semanticColors.errorBackground
              : theme.semanticColors.warningBackground;
          return (
            <div
              key={idx}
              style={{ color, padding: theme.spacing.s1, cursor: "pointer" }}
              onClick={() => showProblemModal(problem)}
            >
              <Icon iconName={iconName} />
              &nbsp;
              {problem.message}
            </div>
          );
        })}
      </>
    );

  return (
    <SidebarContent
      title="Connection"
      trailingItems={[
        <IconButton
          key="new"
          iconProps={{ iconName: "Add" }}
          styles={{
            icon: {
              svg: {
                fill: "currentColor",
                height: "1em",
                width: "1em",
              },
            },
          }}
        />,
      ]}
    >
      {content}
    </SidebarContent>
  );
}
