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

import { ActionButton, IconButton, Stack, Text, IButtonStyles, IColor } from "@fluentui/react";
import pluralize from "pluralize";
import { useCallback, useContext, useMemo } from "react";

import { useTooltip } from "@foxglove/studio-base/components/Tooltip";
import useGuaranteedContext from "@foxglove/studio-base/hooks/useGuaranteedContext";
import { ThreeDimensionalVizContext } from "@foxglove/studio-base/panels/ThreeDimensionalViz/ThreeDimensionalVizContext";
import { canEditDatatype } from "@foxglove/studio-base/panels/ThreeDimensionalViz/TopicSettingsEditor";
import {
  ROW_HEIGHT,
  TREE_SPACING,
} from "@foxglove/studio-base/panels/ThreeDimensionalViz/TopicTree/constants";
import { TopicTreeContext } from "@foxglove/studio-base/panels/ThreeDimensionalViz/TopicTree/useTopicTree";
import { SECOND_SOURCE_PREFIX } from "@foxglove/studio-base/util/globalConstants";
import { colors } from "@foxglove/studio-base/util/sharedStyleConstants";
import { joinTopics } from "@foxglove/studio-base/util/topicUtils";

import NodeName from "./NodeName";
import TreeNodeMenu, { DOT_MENU_WIDTH } from "./TreeNodeMenu";
import VisibilityToggle, { TOGGLE_WRAPPER_SIZE, TOPIC_ROW_PADDING } from "./VisibilityToggle";
import { DerivedCustomSettings, SetCurrentEditingTopic, TreeNode } from "./types";

export const ICON_SIZE = 22;

const MAX_GROUP_ERROR_WIDTH = 64;
const VISIBLE_COUNT_WIDTH = 18;
const VISIBLE_COUNT_MARGIN = 4;

const iconStyles = (color: IColor["str"]) =>
  ({
    root: {
      width: 18,
      height: 18,
    },
    rootHovered: { backgroundColor: "transparent" },
    rootPressed: { backgroundColor: "transparent" },
    rootFocused: { backgroundColor: "transparent" },
    icon: {
      color,
      fontSize: 14,
      height: 14,
      lineHeight: 14,

      svg: {
        fill: "currentColor",
        height: "1em",
        width: "1em",
      },
    },
  } as Partial<IButtonStyles>);

const topicsCountStyles = (color: IColor["str"]) => ({
  root: {
    height: ROW_HEIGHT - 6,
    paddingTop: 2,
    fontSize: 10,
    margin: `0 ${VISIBLE_COUNT_MARGIN}px`,
    color,
  },
  rootHovered: {
    color,
  },
});

type Props = {
  checkedKeysSet: Set<string>;
  hasChildren: boolean;
  hasFeatureColumn: boolean;
  isXSWidth: boolean;
  node: TreeNode;
  nodeVisibleInScene: boolean;
  visibleByColumn: (boolean | undefined)[];
  sceneErrors: string[] | undefined;
  setCurrentEditingTopic: SetCurrentEditingTopic;
  derivedCustomSettings?: DerivedCustomSettings;
  width: number;
  filterText: string;
  tooltips?: React.ReactNode[];
  visibleTopicsCount: number;
  diffModeEnabled: boolean;
};

export default function TreeNodeRow({
  checkedKeysSet,
  derivedCustomSettings,
  filterText,
  hasChildren,
  hasFeatureColumn,
  isXSWidth,
  node,
  node: { availableByColumn, providerAvailable, name, key, featureKey },
  nodeVisibleInScene,
  sceneErrors,
  setCurrentEditingTopic,
  tooltips,
  visibleByColumn,
  visibleTopicsCount,
  width,
  diffModeEnabled,
}: Props): JSX.Element {
  const topicName = node.type === "topic" ? node.topicName : "";
  const datatype = node.type === "topic" ? node.datatype : undefined;

  const isDefaultSettings =
    !derivedCustomSettings || (derivedCustomSettings.isDefaultSettings ?? false);
  const showTopicSettings = topicName.length > 0 && !!datatype && canEditDatatype(datatype);
  const showTopicSettingsChanged = showTopicSettings && !isDefaultSettings;

  const showTopicError =
    node.type === "topic" && sceneErrors != undefined && sceneErrors.length > 0;
  const showGroupError =
    node.type === "group" && sceneErrors != undefined && sceneErrors.length > 0;
  const showVisibleTopicsCount =
    providerAvailable && node.type === "group" && node.children && visibleTopicsCount > 0;

  const togglesWidth = hasFeatureColumn ? TOGGLE_WRAPPER_SIZE * 2 : TOGGLE_WRAPPER_SIZE;
  const rightActionWidth = providerAvailable ? togglesWidth + DOT_MENU_WIDTH : DOT_MENU_WIDTH;
  const rowWidth = width - (isXSWidth ? 0 : TREE_SPACING * 2);

  // -8px to add some spacing between the name and right action area.
  let maxNodeNameWidth = rowWidth - rightActionWidth - 8;

  if (showTopicSettingsChanged) {
    maxNodeNameWidth -= ICON_SIZE;
  }
  if (showGroupError) {
    maxNodeNameWidth -= MAX_GROUP_ERROR_WIDTH;
  }
  if (showTopicError) {
    maxNodeNameWidth -= ICON_SIZE;
  }
  maxNodeNameWidth -= showVisibleTopicsCount ? VISIBLE_COUNT_WIDTH + VISIBLE_COUNT_MARGIN * 2 : 0;

  const { setHoveredMarkerMatchers } = useContext(ThreeDimensionalVizContext);
  const updateHoveredMarkerMatchers = useCallback(
    // eslint-disable-next-line @foxglove/no-boolean-parameters
    (columnIndex: number, visible: boolean) => {
      if (visible) {
        const topic = [topicName, joinTopics(SECOND_SOURCE_PREFIX, topicName)][columnIndex];
        if (!topic) {
          return;
        }
        setHoveredMarkerMatchers([{ topic }]);
      }
    },
    [setHoveredMarkerMatchers, topicName],
  );

  const onMouseLeave = useCallback(() => setHoveredMarkerMatchers([]), [setHoveredMarkerMatchers]);
  const mouseEventHandlersByColumnIdx = useMemo(() => {
    return new Array(2).fill(0).map((_, columnIndex) => ({
      onMouseEnter: () => updateHoveredMarkerMatchers(columnIndex, true),
      onMouseLeave,
    }));
  }, [onMouseLeave, updateHoveredMarkerMatchers]);
  const {
    toggleCheckAllAncestors,
    toggleNodeChecked,
    toggleNodeExpanded,
    toggleCheckAllDescendants,
  } = useGuaranteedContext(TopicTreeContext, "TopicTreeContext");

  const topicsCount = useTooltip({
    contents: `${pluralize("visible topic", visibleTopicsCount, true)} in this group`,
  });
  const editIcon = useTooltip({ contents: "Topic settings editor" });
  const alertIcon = useTooltip({
    contents: (
      <Stack styles={{ root: { maxWidth: 240, wordWrap: "break-word" } }}>
        {sceneErrors?.map((errStr) => (
          <Text key={errStr} variant="small" styles={{ root: { color: "inherit" } }}>
            {errStr}
          </Text>
        ))}
      </Stack>
    ),
  });

  return (
    <div>
      {alertIcon.tooltip}
      <Stack
        horizontal
        horizontalAlign="space-between"
        verticalAlign="center"
        styles={{
          root: {
            color: nodeVisibleInScene ? "inherit" : colors.TEXT_MUTED,
            width: rowWidth,
          },
        }}
      >
        <Stack
          horizontal
          verticalAlign="center"
          grow={1}
          data-test={`name~${key}`}
          onClick={hasChildren ? () => toggleNodeExpanded(key) : undefined}
          styles={{
            root: {
              cursor: hasChildren && filterText.length === 0 ? "pointer" : "default",
              minHeight: TOGGLE_WRAPPER_SIZE,
              padding: `${TOPIC_ROW_PADDING}px 0px`,
            },
          }}
        >
          <NodeName
            isXSWidth={isXSWidth}
            maxWidth={maxNodeNameWidth}
            displayName={name ? name : topicName}
            tooltips={tooltips}
            topicName={topicName}
            searchText={filterText}
          />
          {showVisibleTopicsCount && (
            <Stack.Item grow>
              {topicsCount.tooltip}
              <ActionButton
                elementRef={topicsCount.ref}
                styles={topicsCountStyles(colors.TEXT_SORTA_MUTED)}
              >
                {visibleTopicsCount}
              </ActionButton>
            </Stack.Item>
          )}
          {showGroupError && sceneErrors && (
            <Stack.Item>
              <ActionButton elementRef={alertIcon.ref} styles={topicsCountStyles(colors.RED)}>
                {pluralize("error", sceneErrors?.length ?? 0, true)}
              </ActionButton>
            </Stack.Item>
          )}
          {showTopicSettingsChanged && datatype && (
            <Stack.Item>
              {editIcon.tooltip}
              <IconButton
                elementRef={editIcon.ref}
                onClick={() => setCurrentEditingTopic({ name: topicName, datatype })}
                iconProps={{ iconName: "LeadPencil" }}
                styles={iconStyles(colors.HIGHLIGHT)}
              />
            </Stack.Item>
          )}
          {showTopicError && (
            <Stack horizontal verticalAlign="center">
              <Stack.Item>
                <IconButton
                  elementRef={alertIcon.ref}
                  iconProps={{ iconName: "AlertCircle" }}
                  styles={iconStyles(colors.RED)}
                />
              </Stack.Item>
            </Stack>
          )}
        </Stack>

        <Stack horizontal horizontalAlign="end" verticalAlign="center">
          {providerAvailable && (
            <Stack horizontal verticalAlign="center">
              {availableByColumn.map((available, columnIdx) => {
                const checked = checkedKeysSet.has(columnIdx === 1 ? featureKey : key);
                return (
                  <VisibilityToggle
                    available={available}
                    dataTest={`visibility-toggle~${key}~column${columnIdx}`}
                    key={columnIdx}
                    size={node.type === "topic" ? "SMALL" : "NORMAL"}
                    overrideColor={derivedCustomSettings?.overrideColorByColumn?.[columnIdx]}
                    checked={checked}
                    onToggle={() => {
                      toggleNodeChecked(key, columnIdx);
                      updateHoveredMarkerMatchers(columnIdx, !checked);
                    }}
                    onShiftToggle={() => {
                      toggleCheckAllDescendants(key, columnIdx);
                      updateHoveredMarkerMatchers(columnIdx, !checked);
                    }}
                    onAltToggle={() => {
                      toggleCheckAllAncestors(key, columnIdx);
                      updateHoveredMarkerMatchers(columnIdx, !checked);
                    }}
                    unavailableTooltip={
                      node.type === "group"
                        ? "None of the topics in this group are currently available"
                        : "Unavailable"
                    }
                    visibleInScene={visibleByColumn[columnIdx] ?? false}
                    {...mouseEventHandlersByColumnIdx[columnIdx]}
                    diffModeEnabled={diffModeEnabled}
                    columnIndex={columnIdx}
                  />
                );
              })}
            </Stack>
          )}
          <TreeNodeMenu
            datatype={showTopicSettings ? datatype : undefined}
            disableBaseColumn={diffModeEnabled || !(availableByColumn[0] ?? false)}
            disableFeatureColumn={diffModeEnabled || !(availableByColumn[1] ?? false)}
            hasFeatureColumn={hasFeatureColumn && (availableByColumn[1] ?? false)}
            nodeKey={key}
            providerAvailable={providerAvailable}
            setCurrentEditingTopic={setCurrentEditingTopic}
            topicName={topicName}
          />
        </Stack>
      </Stack>
    </div>
  );
}
