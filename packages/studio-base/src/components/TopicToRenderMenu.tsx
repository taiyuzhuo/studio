// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  IconButton,
  IButtonStyles,
  IContextualMenuItemStyles,
  IContextualMenuProps,
  ITheme,
  useTheme,
} from "@fluentui/react";
import { uniq } from "lodash";
import { useMemo } from "react";

import { Topic } from "@foxglove/studio-base/players/types";

type Props = {
  onChange: (topic: string) => void;
  topicToRender: string;
  topics: readonly Topic[];
  allowedDatatypes: string[];
  defaultTopicToRender: string;
};

const topicButtonStyles = (theme: ITheme, { available }: { available: boolean }) => {
  const color = available ? theme.palette.neutralPrimary : theme.semanticColors.warningBackground;

  return {
    root: {
      opacity: 0.6,
      backgroundColor: "transparent",
      height: 16,
      padding: 0,
      color,
    },
    rootDisabled: { opacity: 0.4, backgroundColor: "transparent" },
    rootExpanded: { opacity: 1, backgroundColor: "transparent" },
    rootExpandedHovered: { opacity: 1, backgroundColor: "transparent" },
    rootFocused: { backgroundColor: "transparent", color },
    rootHasMenu: { backgroundColor: "transparent", color },
    rootHovered: { opacity: 0.8, backgroundColor: "transparent", color },
    rootPressed: { opacity: 1, backgroundColor: "transparent", color },
    icon: {
      fontSize: 14,
      margin: "0 1px",

      svg: {
        fill: "currentColor",
        height: "1em",
        width: "1em",
      },
    },
    iconHovered: {
      color: "currentColor",
    },
    menuIcon: {
      display: "none",
    },
  } as Partial<IButtonStyles>;
};

export default function TopicToRenderMenu({
  onChange,
  topicToRender,
  topics,
  allowedDatatypes,
  defaultTopicToRender,
}: Props): JSX.Element {
  const theme = useTheme();
  const allowedDatatypesSet = useMemo(() => new Set(allowedDatatypes), [allowedDatatypes]);

  const availableTopics: Topic["name"][] = topics.reduce((acc, topic) => {
    if (allowedDatatypesSet.has(topic.datatype)) {
      acc.push(topic.name);
    }
    return acc;
  }, [] as Topic["name"][]);

  // Keeps only the first occurrence of each topic.
  const renderTopics: Topic["name"][] = uniq([
    defaultTopicToRender,
    ...availableTopics,
    topicToRender,
  ]);

  const menuProps: IContextualMenuProps = useMemo(
    () => ({
      items: renderTopics.map((topic) => ({
        canCheck: true,
        checked: topic === topicToRender,
        key: topic,
        onClick: () => onChange(topic),
        text: [
          topic.length > 0 ? topic : "Default",
          !availableTopics.includes(topic) && "(not available)",
        ]
          .filter(Boolean)
          .join(" "),
      })),
      styles: {
        subComponentStyles: {
          menuItem: {
            root: {
              height: 32,
              lineHeight: 32,
              fontSize: theme.fonts.small.fontSize,
            },
            linkContent: {
              flexDirection: "row-reverse",
            },
            checkmarkIcon: {
              color: theme.palette.themePrimary,
            },
          } as Partial<IContextualMenuItemStyles>,
        },
      },
    }),
    [
      availableTopics,
      onChange,
      renderTopics,
      theme.fonts.small.fontSize,
      theme.palette.themePrimary,
      topicToRender,
    ],
  );

  return (
    <IconButton
      title={`Supported datatypes: ${allowedDatatypes.join(", ")}`}
      data-test="topic-set"
      iconProps={{ iconName: "Database" }}
      menuIconProps={{ iconName: undefined }}
      menuProps={menuProps}
      styles={topicButtonStyles(theme, {
        available: topicToRender === defaultTopicToRender,
      })}
    />
  );
}
