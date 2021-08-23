// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/
//
// This file incorporates work covered by the following copyright and
// permission notice:
//
//   Copyright 2018-2021 Cruise LLC
//
//   This source code is licensed under the Apache License, Version 2.0,
//   found at http://www.apache.org/licenses/LICENSE-2.0
//   You may not use this file except in compliance with the License.

import { mergeStyleSets } from "@fluentui/react";
import BlockHelperIcon from "@mdi/svg/svg/block-helper.svg";
import CheckboxBlankOutlineIcon from "@mdi/svg/svg/checkbox-blank-outline.svg";
import CheckboxBlankIcon from "@mdi/svg/svg/checkbox-blank.svg";
import CheckboxMarkedIcon from "@mdi/svg/svg/checkbox-marked.svg";
import ChevronDownIcon from "@mdi/svg/svg/chevron-down.svg";
import ChevronRightIcon from "@mdi/svg/svg/chevron-right.svg";
import CloseIcon from "@mdi/svg/svg/close.svg";
import EyeOffOutlineIcon from "@mdi/svg/svg/eye-off-outline.svg";
import EyeOutlineIcon from "@mdi/svg/svg/eye-outline.svg";
import FolderIcon from "@mdi/svg/svg/folder.svg";
import LeadPencilIcon from "@mdi/svg/svg/lead-pencil.svg";
import cx from "classnames";
import React, { Component } from "react";

import Icon from "@foxglove/studio-base/components/Icon";
import Tooltip from "@foxglove/studio-base/components/Tooltip";
import { colors } from "@foxglove/studio-base/util/sharedStyleConstants";

import { Node } from "./Node";

type Props = {
  node: Node;
  depth: number;
  disableCheckbox?: boolean;
  enableVisibilityToggle?: boolean;
  onRemoveNode?: (node: Node) => void;
  onToggleExpand: (node: Node) => void;
  onToggleVisibility?: (node: Node) => void;
  onToggleCheck: (node: Node) => void;
  onEditClick: (e: React.MouseEvent<HTMLElement>, node: Node) => void;
};

const styles = mergeStyleSets({
  children: {
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  checkbox: {
    marginRight: 6,
    opacity: 0.6,

    svg: {
      fontSize: "16px",
      position: "relative",
      top: -1,
    },
    "&:hover": {
      opacity: 1,
    },
    "&.disabled, &[disabled]": {
      pointerEvents: "none",
    },
  },
  blockHelperIcon: {
    fontSize: "14px !important",
    top: 0,
    paddingLeft: 2,
    pointerEvents: "none",
  },
  header: {
    position: "relative",
    display: "flex",
    flexDirection: "row",
    paddingRight: 6,
    alignItems: "center",
    verticalAlign: "center",
    lineHeight: 30,
    height: 30,
    cursor: "pointer",

    "&:hover": {
      background: "#3b2e76",
    },
  },
  headerText: {
    flex: "1 1 auto",
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    marginRight: 4,
  },
  headerExtraIcon: {
    opacity: 0.5,
    marginRight: 6,
  },
  headerExpandIcon: {
    fontSize: "14px",
    opacity: 0.75,
    position: "absolute",
    left: 0,
  },
  invisible: {
    visibility: "hidden",
  },
  hasChildren: {
    color: colors.TEXT_BRIGHT,
  },
  disabled: {
    color: colors.TEXT_DISABLED,
    cursor: "auto",

    "&:hover": {
      background: "transparent",
    },
  },
});

export default class TreeNode extends Component<Props> {
  onCheckboxClick = (): void => {
    const { onToggleCheck, node } = this.props;
    if (!(node.disabled ?? false) && (node.hasCheckbox ?? false)) {
      onToggleCheck(node);
    }
  };

  onRemoveNode = (): void => {
    if (this.props.onRemoveNode) {
      this.props.onRemoveNode(this.props.node);
    }
  };

  onToggleVisibility = (e: React.SyntheticEvent<HTMLElement>): void => {
    const { onToggleVisibility, node } = this.props;
    if (onToggleVisibility) {
      // stop propagation so it does not trigger expanding/collapsing topics with namespaces
      e.stopPropagation();
      onToggleVisibility(node);
    }
  };

  onExpandClick = (_e: React.SyntheticEvent<HTMLElement>): void => {
    const { onToggleExpand, node } = this.props;
    // if the node has no children, have the entire container be a hitbox for toggling checked
    if (node.children.length > 0) {
      onToggleExpand(node);
    } else {
      this.onCheckboxClick();
    }
  };

  renderChildren(): React.ReactNode {
    const {
      depth,
      disableCheckbox,
      enableVisibilityToggle,
      node,
      onRemoveNode,
      onEditClick,
      onToggleCheck,
      onToggleExpand,
      onToggleVisibility,
    } = this.props;
    if (!(node.expanded ?? false) || node.children.length === 0) {
      return ReactNull;
    }
    return node.children.map((child) => {
      return (
        <TreeNode
          depth={depth + 1}
          disableCheckbox={disableCheckbox}
          enableVisibilityToggle={enableVisibilityToggle}
          key={child.id}
          node={child}
          onEditClick={onEditClick}
          onRemoveNode={onRemoveNode}
          onToggleCheck={onToggleCheck}
          onToggleExpand={onToggleExpand}
          onToggleVisibility={onToggleVisibility}
        />
      );
    });
  }

  getCheckboxIcon(): React.ReactNode {
    const {
      checked,
      disabled = false,
      missing = false,
      hasCheckbox = false,
      children,
    } = this.props.node;
    if (!hasCheckbox) {
      return children.length > 0 && <FolderIcon />;
    }
    if (missing) {
      return <BlockHelperIcon className={styles.blockHelperIcon} />;
    }
    if (checked) {
      return disabled ? <CheckboxBlankIcon /> : <CheckboxMarkedIcon />;
    }
    return <CheckboxBlankOutlineIcon />;
  }

  onEditClick = (e: React.MouseEvent<HTMLElement>): void => {
    const { onEditClick, node } = this.props;
    if (!(node.canEdit ?? false)) {
      return;
    }
    e.stopPropagation();
    onEditClick(e, node);
  };

  override render(): React.ReactNode {
    const { node, depth, enableVisibilityToggle = false, disableCheckbox = false } = this.props;
    const {
      expanded = false,
      children,
      icon,
      disabled,
      tooltip,
      canEdit,
      hasEdit = false,
      filtered = false,
      visible,
      namespace,
    } = node;
    const headerClasses = cx(styles.header, {
      [styles.hasChildren]: children?.length,
      [styles.disabled]: disabled,
    });

    const indentWidth = 20;
    const paddingLeft = 18;
    const style = { paddingLeft: paddingLeft + depth * indentWidth };

    const checkboxClasses = cx(styles.checkbox, {
      [styles.disabled]: disabled,
      disabled,
    });

    const extraIcon = icon != undefined && (
      <Icon
        fade
        className={cx(styles.headerExtraIcon, { [styles.disabled]: disabled })}
        style={{ color: hasEdit ? colors.ACCENT : "#666" }}
      >
        {icon}
      </Icon>
    );

    const editIcon = icon != undefined && canEdit && (
      <Icon
        style={{ padding: "0 4px" }}
        fade
        tooltip="Edit topic settings"
        onClick={this.onEditClick}
      >
        <LeadPencilIcon />
      </Icon>
    );

    // only enable visibility toggle for topics
    const visibilityIcon = enableVisibilityToggle && node.topic && !node.namespace && (
      <Icon
        style={{ padding: "0 4px" }}
        fade
        tooltip={visible ? "Hide topic temporarily" : "Show topic"}
        onClick={this.onToggleVisibility}
        dataTest={`node-${node.topic ?? node.name}`}
      >
        {visible ? <EyeOutlineIcon /> : <EyeOffOutlineIcon />}
      </Icon>
    );

    // for simplicity, don't render remove UI for namespaces
    const renderRemoveIcon = disableCheckbox && !namespace;
    const removeIcon = renderRemoveIcon && (
      <Icon
        style={{ padding: "0 4px" }}
        fade
        tooltip="Remove the item from the list"
        onClick={this.onRemoveNode}
        dataTest={`node-remove-${node.topic ?? node.name}`}
      >
        <CloseIcon />
      </Icon>
    );

    // Wrap in a fragment to avoid missing key warnings
    const tooltipContents =
      tooltip && tooltip.length > 0 && React.createElement(React.Fragment, {}, ...tooltip);

    return (
      <div style={filtered ? { display: "none" } : {}}>
        <div style={style} className={headerClasses} onClick={this.onExpandClick}>
          {!renderRemoveIcon && (
            <Icon className={checkboxClasses} onClick={this.onCheckboxClick}>
              {this.getCheckboxIcon()}
            </Icon>
          )}
          {extraIcon}
          <span className={styles.headerText}>
            <Tooltip contents={tooltipContents}>
              <span>{node.text}</span>
            </Tooltip>
          </span>
          {editIcon}
          {visibilityIcon}
          {removeIcon}
          <Icon
            className={cx(styles.headerExpandIcon, {
              [styles.invisible]: children.length === 0,
            })}
            style={{ left: paddingLeft + depth * indentWidth - 16 }}
          >
            {expanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </Icon>
        </div>
        <div className={styles.children}>{this.renderChildren()}</div>
      </div>
    );
  }
}
