// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Icon, IconButton, Stack, Text, makeStyles, useTheme, TextField } from "@fluentui/react";
import cx from "classnames";
import { groupBy } from "lodash";
import { Fragment, useCallback, useContext, useState } from "react";

import { subtract as subtractTimes, toSec } from "@foxglove/rostime";
// import CopyText from "@foxglove/studio-base/components/CopyText";
import EmptyState from "@foxglove/studio-base/components/EmptyState";
import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import NotificationModal from "@foxglove/studio-base/components/NotificationModal";
// import PanelToolbar from "@foxglove/studio-base/components/PanelToolbar";
import ModalContext from "@foxglove/studio-base/context/ModalContext";
// import {
//   IDataSourceFactory,
//   usePlayerSelection,
// } from "@foxglove/studio-base/context/PlayerSelectionContext";
// import { useConfirm } from "@foxglove/studio-base/hooks/useConfirm";
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
  table: {
    tableLayout: "fixed",
    borderCollapse: "collapse",
    borderSpacing: "0",
    width: "100%",
  },
  tableHead: {
    color: theme.palette.neutralSecondary,
  },
  tableCell: {
    fontSize: theme.fonts.smallPlus.fontSize,
    color: theme.palette.neutralTertiary,
    padding: theme.spacing.s1,

    ":first-child": {
      paddingLeft: theme.spacing.m,
    },
    ":last-child": {
      paddingRight: theme.spacing.m,
    },
  },
  alignRight: {
    textAlign: "right !important",
  },
  count: {},
  frequency: {},
}));

export default function ConnectionList(): JSX.Element {
  // const { selectSource, availableSources } = usePlayerSelection();
  // const confirm = useConfirm();
  const [groupedTopics, setGroupedTopics] = useState<boolean>(true);
  const modalHost = useContext(ModalContext);
  const classes = useStyles();

  const playerProblems = useMessagePipeline(selectPlayerProblems) ?? emptyArray;
  const playerPresence = useMessagePipeline(selectPlayerPresence);
  const playerName = useMessagePipeline(selectPlayerName);

  const topics = useMessagePipeline(useCallback((ctx) => ctx.playerState.activeData?.topics, []));
  const startTime = useMessagePipeline(
    useCallback((ctx) => ctx.playerState.activeData?.startTime, []),
  );
  const endTime = useMessagePipeline(useCallback((ctx) => ctx.playerState.activeData?.endTime, []));

  const theme = useTheme();

  // const onSourceClick = useCallback(
  //   (source: IDataSourceFactory) => {
  //     if (source.disabledReason != undefined) {
  //       void confirm({
  //         title: "Unsupported connection",
  //         prompt: source.disabledReason,
  //         variant: "primary",
  //         cancel: false,
  //       });
  //       return;
  //     }

  //     selectSource(source.id);
  //   },
  //   [confirm, selectSource],
  // );

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

  if (!startTime || !endTime) {
    return <EmptyState>Waiting for data...</EmptyState>;
  }

  const duration = subtractTimes(endTime, startTime);

  const topicsByDatatype = groupBy(topics, (topic) => topic.datatype);

  return (
    <>
      {playerPresence === PlayerPresence.NOT_PRESENT ? (
        "Not connected. Choose a data source below to get started."
      ) : (
        <>
          <Stack tokens={{ childrenGap: theme.spacing.m }}>
            <Stack
              tokens={{
                childrenGap: theme.spacing.m,
                padding: `${theme.spacing.s1} ${theme.spacing.m}`,
              }}
              styles={{
                root: {
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                },
              }}
            >
              <Stack tokens={{ childrenGap: theme.spacing.s2 }}>
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
                <Timestamp time={startTime} />
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
                <Timestamp time={endTime} />
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
                  styles={{
                    root: {
                      fontFamily: fonts.MONOSPACE,
                      color: theme.palette.neutralSecondary,
                    },
                  }}
                >
                  {formatDuration(duration)}
                </Text>
              </Stack>
            </Stack>

            <Stack
              tokens={{ childrenGap: theme.spacing.m }}
              styles={{ root: { borderTop: `1px solid ${theme.semanticColors.bodyFrameDivider}` } }}
            >
              <Stack
                tokens={{ padding: `${theme.spacing.m}`, childrenGap: theme.spacing.s1 }}
                styles={{
                  root: {
                    position: "sticky",
                    top: 0,
                    backgroundColor: theme.semanticColors.bodyStandoutBackground,
                  },
                }}
              >
                <TextField
                  iconProps={{ iconName: "Search" }}
                  placeholder="Search availble topics"
                  styles={{
                    root: {
                      flex: 1,
                      width: "100%",
                    },
                    icon: {
                      lineHeight: 0,
                      color: theme.semanticColors.inputText,
                      left: theme.spacing.s1,
                      right: "auto",
                      fontSize: 18,

                      svg: {
                        fill: "currentColor",
                        height: "1em",
                        width: "1em",
                      },
                    },
                    field: {
                      fontSize: theme.fonts.small.fontSize,
                      lineHeight: 30,
                      padding: `0 ${theme.spacing.l2}`,

                      "::placeholder": {
                        opacity: 0.6,
                        fontSize: theme.fonts.small.fontSize,
                        lineHeight: 30,
                      },
                    },
                  }}
                />
                <Stack horizontal verticalAlign="center">
                  <IconButton
                    iconProps={{ iconName: "Filter" }}
                    styles={{
                      icon: { svg: { fill: "currentColor", height: "1em", width: "1em" } },
                    }}
                    menuProps={{
                      items: [
                        { key: "1", text: "Sort by Topic" },
                        { key: "1", text: "Sort by Count" },
                      ],
                    }}
                  />
                  <IconButton
                    iconProps={{ iconName: groupedTopics ? "UnfoldMore" : "UnfoldLess" }}
                    styles={{
                      icon: { svg: { fill: "currentColor", height: "1em", width: "1em" } },
                    }}
                    onClick={() => setGroupedTopics(!groupedTopics)}
                  />
                </Stack>
              </Stack>
              <Stack>
                {groupedTopics
                  ? Object.entries(topicsByDatatype).map(([datatype, t]) => (
                      <Fragment key={datatype}>
                        <Text
                          variant="small"
                          styles={{
                            root: {
                              position: "sticky",
                              top: 100,
                              display: "block",
                              backgroundColor: theme.semanticColors.bodyStandoutBackground,
                              color: theme.palette.neutralSecondary,
                              padding: `${theme.spacing.s2} ${theme.spacing.m}`,
                            },
                          }}
                        >
                          {datatype}
                        </Text>
                        {t.map((topic) => (
                          <Stack
                            horizontal
                            verticalAlign="center"
                            key={topic.name}
                            tokens={{
                              padding: `${theme.spacing.s1} ${theme.spacing.m} ${theme.spacing.s1} ${theme.spacing.l2}`,
                              childrenGap: theme.spacing.s1,
                            }}
                          >
                            <Stack.Item grow styles={{ root: { minWidth: 0, overflow: "hidden" } }}>
                              <Text
                                variant="small"
                                title={topic.name}
                                styles={{
                                  root: {
                                    overflow: "hidden",
                                    whiteSpace: "nowrap",
                                    textOverflow: "ellipsis",
                                    display: "block",
                                  },
                                }}
                              >
                                {topic.name}
                              </Text>
                            </Stack.Item>
                            <Text
                              variant="small"
                              styles={{
                                root: {
                                  color: theme.palette.neutralTertiary,
                                  whiteSpace: "nowrap",
                                },
                              }}
                            >
                              {topic.numMessages != undefined && `${topic.numMessages}`}
                            </Text>
                            <Text
                              variant="small"
                              styles={{
                                root: {
                                  color: theme.palette.neutralTertiary,
                                  whiteSpace: "nowrap",
                                },
                              }}
                            >
                              {topic.numMessages != undefined &&
                                `(${(topic.numMessages / toSec(duration)).toFixed(2)} Hz)`}
                            </Text>
                          </Stack>
                        ))}
                      </Fragment>
                    ))
                  : topics
                      ?.sort((a, b) => a.name.localeCompare(b.name))
                      .map((topic) => (
                        <Stack
                          horizontal
                          verticalAlign="center"
                          key={topic.name}
                          tokens={{
                            padding: `0 ${theme.spacing.m}`,
                            childrenGap: theme.spacing.s1,
                          }}
                        >
                          <Stack.Item grow styles={{ root: { minWidth: 0, overflow: "hidden" } }}>
                            <Text
                              title={topic.name}
                              variant="small"
                              styles={{
                                root: {
                                  overflow: "hidden",
                                  whiteSpace: "nowrap",
                                  textOverflow: "ellipsis",
                                  maxWidth: "99.99999%",
                                  display: "block",
                                },
                              }}
                            >
                              {topic.name}
                            </Text>
                          </Stack.Item>
                          <Text
                            variant="small"
                            styles={{
                              root: { color: theme.palette.neutralTertiary, whiteSpace: "nowrap" },
                            }}
                          >
                            {topic.numMessages != undefined && `${topic.numMessages}`}
                          </Text>
                          <Text
                            variant="small"
                            styles={{
                              root: { color: theme.palette.neutralTertiary, whiteSpace: "nowrap" },
                            }}
                          >
                            {topic.numMessages != undefined &&
                              `(${(topic.numMessages / toSec(duration)).toFixed(2)} Hz)`}
                          </Text>
                          <IconButton
                            iconProps={{ iconName: "MoreVertical" }}
                            styles={{
                              root: {
                                marginRight: `-${theme.spacing.s1}`,
                              },
                              icon: {
                                svg: { fill: "currentColor", height: "1em", width: "1em" },
                              },
                            }}
                          />
                        </Stack>
                      ))}
              </Stack>
            </Stack>
          </Stack>
          {/* <DetailsList
            selectionMode={SelectionMode.none}
            layoutMode={DetailsListLayoutMode.justified}
            items={topics?.map((topic) => ({
              key: topic.name,
              name: topic.name,
              datatype: topic.datatype,
              numMessages: topic.numMessages ?? "",
            }))}
            columns={[
              {
                key: "name",
                name: "Topic name",
                fieldName: "name",
                minWidth: 0,
                isResizable: true,
              },
              {
                key: "datatype",
                name: "Data type",
                fieldName: "datatype",
                minWidth: 0,
                isCollapsible: true,
                isResizable: true,
              },
              {
                key: "numMessages",
                name: "Count",
                fieldName: "numMessages",
                minWidth: 0,
                isResizable: true,
              },
              {
                key: "frequency",
                name: "Hz",
                fieldName: "frequency",
                minWidth: 0,
                onRender: (topic: Topic) =>
                  topic.numMessages != undefined
                    ? `${(topic.numMessages / toSec(duration)).toFixed(2)} Hz`
                    : "",
              },
            ]}
            styles={{
              root: {
                // border: "1px solid red"
              },
              headerWrapper: {
                // border: "1px solid green"
              },
              contentWrapper: {
                // border: "1px solid blue"
              },
              focusZone: {
                // border: "1px solid yellow"
              },
            }}
          /> */}
        </>
      )}
      {/* <Text
        block
        styles={{ root: { color: theme.palette.neutralTertiary, marginBottom: theme.spacing.l1 } }}
      >
      </Text>
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
              {source.badgeText && <span className={styles.badge}>{source.badgeText}</span>}
            </ActionButton>
          </div>
        );
      })} */}

      {playerProblems.length > 0 && (
        <hr style={{ width: "100%", height: "1px", border: 0, backgroundColor: colors.DIVIDER }} />
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
}
