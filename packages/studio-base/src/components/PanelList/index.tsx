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

import SearchIcon from "@mui/icons-material/Search";
import { AppBar, Theme, Toolbar } from "@mui/material";
import {
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Container,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { makeStyles } from "@mui/styles";
import cx from "classnames";
import fuzzySort from "fuzzysort";
import { isEmpty } from "lodash";
import { useCallback, useEffect, useMemo } from "react";
import { useDrag } from "react-dnd";
import { MosaicDragType, MosaicPath } from "react-mosaic-component";

import { LegacyInput } from "@foxglove/studio-base/components/LegacyStyledComponents";
import TextHighlight from "@foxglove/studio-base/components/TextHighlight";
import { useTooltip } from "@foxglove/studio-base/components/Tooltip";
import {
  useCurrentLayoutActions,
  usePanelMosaicId,
} from "@foxglove/studio-base/context/CurrentLayoutContext";
import { PanelInfo, usePanelCatalog } from "@foxglove/studio-base/context/PanelCatalogContext";
import {
  PanelConfig,
  MosaicDropTargetPosition,
  SavedProps,
  MosaicDropResult,
} from "@foxglove/studio-base/types/panels";
import { mightActuallyBePartial } from "@foxglove/studio-base/util/mightActuallyBePartial";

const useStyles = makeStyles((theme: Theme) => {
  return {
    fullHeight: {
      height: "100%",
    },
    imagePlaceholder: {
      paddingBottom: `${(200 / 280) * 100}%`,
      bgcolor: theme.palette.background.default,
    },
    searchInput: {
      backgroundColor: "transparent !important",
      padding: `${theme.spacing(1)} !important`,
      margin: "0 !important",
      width: "100%",
      minWidth: 0,

      "&:hover, :focus": {
        backgroundColor: "transparent",
      },
    },
    appBar: {
      top: 0,
      zIndex: 2,
    },
    appBarBackground: {
      backgroundImage: `linear-gradient(to top, transparent, ${
        theme.palette.background.paper
      } ${theme.spacing(1)})`,
    },
    toolbar: {
      padding: theme.spacing(2),
      justifyContent: "stretch",
    },
    inputWrapper: {
      display: "flex",
      flex: "auto",
      alignItems: "center",
      justifyContent: "center",
      paddingLeft: theme.spacing(1),
      backgroundColor: theme.palette.background.paper,
      borderRadius: theme.shape.borderRadius,
      border: `1px solid ${theme.palette.text.primary}`,

      "&:focus-within": {
        borderColor: theme.palette.primary.main,
      },
    },
    cardContent: {
      flex: "auto",
    },
    grab: {
      cursor: "grab",
    },
    grid: {
      display: "grid !important",
      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
      gap: theme.spacing(2),
    },
    noResults: {
      alignItems: "center",
      justifyContent: "center",
      padding: theme.spacing(2, 1),
      color: theme.palette.text.secondary,
    },
  };
});

type DropDescription = {
  type: string;
  config?: PanelConfig;
  relatedConfigs?: SavedProps;
  position?: MosaicDropTargetPosition;
  path?: MosaicPath;
  tabId?: string;
};

type PanelItemProps = {
  mode?: "grid" | "list";
  panel: {
    type: string;
    title: string;
    description?: string;
    config?: PanelConfig;
    relatedConfigs?: SavedProps;
    thumbnail?: string;
  };
  searchQuery: string;
  checked?: boolean;
  highlighted?: boolean;
  onClick: () => void;
  mosaicId: string;
  onDrop: (arg0: DropDescription) => void;
};

function DraggablePanelItem({
  mode = "list",
  searchQuery,
  panel,
  onClick,
  onDrop,
  checked = false,
  highlighted = false,
  mosaicId,
}: PanelItemProps) {
  const classes = useStyles();
  const scrollRef = React.useRef<HTMLElement>(ReactNull);
  const [, connectDragSource] = useDrag<unknown, MosaicDropResult, never>({
    type: MosaicDragType.WINDOW,
    // mosaicId is needed for react-mosaic to accept the drop
    item: () => ({ mosaicId }),
    options: { dropEffect: "copy" },
    end: (_item, monitor) => {
      const dropResult = monitor.getDropResult() ?? {};
      const { position, path, tabId } = dropResult;
      // dropping outside mosaic does nothing. If we have a tabId, but no
      // position or path, we're dragging into an empty tab.
      if ((position == undefined || path == undefined) && tabId == undefined) {
        // when dragging a panel into an empty layout treat it link clicking the panel
        // mosaic doesn't give us a position or path to invoke onDrop
        onClick();
        return;
      }
      const { type, config, relatedConfigs } = panel;
      onDrop({ type, config, relatedConfigs, position, path, tabId });
    },
  });

  React.useEffect(() => {
    if (highlighted && scrollRef.current) {
      const highlightedItem = scrollRef.current.getBoundingClientRect();
      const scrollContainer = scrollRef.current.parentElement?.parentElement?.parentElement;
      if (scrollContainer) {
        const scrollContainerToTop = scrollContainer.getBoundingClientRect().top;

        const isInView =
          highlightedItem.top >= 0 &&
          highlightedItem.top >= scrollContainerToTop &&
          highlightedItem.top + 50 <= window.innerHeight;

        if (!isInView) {
          scrollRef.current.scrollIntoView();
        }
      }
    }
  }, [highlighted]);

  const { ref: tooltipRef, tooltip } = useTooltip({
    contents:
      mode === "grid" ? (
        panel.description
      ) : (
        <Stack width={200}>
          {panel.thumbnail != undefined && <img src={panel.thumbnail} alt={panel.title} />}
          <Stack padding={1} spacing={0.5}>
            <Typography variant="body2" style={{ fontWeight: "bold" }}>
              {panel.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {panel.description}
            </Typography>
          </Stack>
        </Stack>
      ),
    placement: mode === "grid" ? undefined : "right",
    delay: 200,
  });
  const mergedRef = useCallback(
    (el: HTMLElement | ReactNull) => {
      connectDragSource(el);
      tooltipRef(el);
      scrollRef.current = el;
    },
    [connectDragSource, tooltipRef, scrollRef],
  );
  switch (mode) {
    case "grid":
      return (
        <Card className={classes.fullHeight}>
          <CardActionArea
            component={Stack}
            ref={mergedRef}
            onClick={onClick}
            className={classes.fullHeight}
          >
            {panel.thumbnail != undefined ? (
              <CardMedia component="img" image={panel.thumbnail} alt={panel.title} />
            ) : (
              <div className={classes.imagePlaceholder} />
            )}
            <CardContent className={classes.cardContent}>
              <Typography variant="subtitle2" gutterBottom>
                <span data-test={`panel-menu-item ${panel.title}`}>
                  <TextHighlight targetStr={panel.title} searchText={searchQuery} />
                </span>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {panel.description}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      );

    case "list":
      return (
        <ListItem disableGutters disablePadding selected={highlighted}>
          {tooltip}
          <ListItemButton
            className={classes.grab}
            disabled={checked}
            ref={mergedRef}
            onClick={onClick}
          >
            <ListItemText
              primary={
                <span data-test={`panel-menu-item ${panel.title}`}>
                  <TextHighlight targetStr={panel.title} searchText={searchQuery} />
                </span>
              }
              primaryTypographyProps={{ fontWeight: checked ? "bold" : undefined }}
            />
          </ListItemButton>
        </ListItem>
      );
  }
}

export type PanelSelection = {
  type: string;
  config?: PanelConfig;
  relatedConfigs?: {
    [panelId: string]: PanelConfig;
  };
};
type Props = {
  mode?: "grid" | "list";
  onPanelSelect: (arg0: PanelSelection) => void;
  selectedPanelTitle?: string;
  backgroundColor?: string;
};

// sanity checks to help panel authors debug issues
function verifyPanels(panels: readonly PanelInfo[]) {
  const panelTypes: Map<string, PanelInfo> = new Map();
  for (const panel of panels) {
    const { title, type, config } = mightActuallyBePartial(panel);
    const dispName = title ?? type ?? "<unnamed>";
    if (type == undefined || type.length === 0) {
      throw new Error(`Panel component ${title} must declare a unique \`static panelType\``);
    }
    const existingPanel = mightActuallyBePartial(panelTypes.get(type));
    if (existingPanel) {
      const bothHaveEmptyConfigs = isEmpty(existingPanel.config) && isEmpty(config);
      if (bothHaveEmptyConfigs) {
        const otherDisplayName = existingPanel.title ?? existingPanel.type ?? "<unnamed>";
        throw new Error(
          `Two components have the same panelType ('${type}') and no preset configs: ${otherDisplayName} and ${dispName}`,
        );
      }
    }
    panelTypes.set(type, panel);
  }
}

function PanelList(props: Props): JSX.Element {
  const classes = useStyles();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [highlightedPanelIdx, setHighlightedPanelIdx] = React.useState<number | undefined>();
  const { mode, onPanelSelect, selectedPanelTitle } = props;

  const { dropPanel } = useCurrentLayoutActions();
  const mosaicId = usePanelMosaicId();

  // Update panel layout when a panel menu item is dropped;
  // actual operations to change layout supplied by react-mosaic-component
  const onPanelMenuItemDrop = React.useCallback(
    ({ config, relatedConfigs, type, position, path, tabId }: DropDescription) => {
      dropPanel({
        newPanelType: type,
        destinationPath: path,
        position,
        tabId,
        config,
        relatedConfigs,
      });
    },
    [dropPanel],
  );

  const handleSearchChange = React.useCallback((e: React.SyntheticEvent<HTMLInputElement>) => {
    const query = e.currentTarget.value;
    setSearchQuery(query);

    // When there is a search query, automatically highlight the first (0th) item.
    // When the user erases the query, remove the highlight.
    setHighlightedPanelIdx(query ? 0 : undefined);
  }, []);

  const panelCatalog = usePanelCatalog();
  const { allRegularPanels, allPreconfiguredPanels } = useMemo(() => {
    const panels = panelCatalog.getPanels();
    const regular = panels.filter((panel) => !panel.config);
    const preconfigured = panels.filter((panel) => panel.config);
    const sortByTitle = (a: PanelInfo, b: PanelInfo) =>
      a.title.localeCompare(b.title, undefined, { ignorePunctuation: true, sensitivity: "base" });

    return {
      allRegularPanels: [...regular].sort(sortByTitle),
      allPreconfiguredPanels: [...preconfigured].sort(sortByTitle),
    };
  }, [panelCatalog]);

  useEffect(() => {
    verifyPanels([...allRegularPanels, ...allPreconfiguredPanels]);
  }, [allRegularPanels, allPreconfiguredPanels]);

  const getFilteredPanels = React.useCallback(
    (panels: PanelInfo[]) => {
      return searchQuery.length > 0
        ? fuzzySort
            .go(searchQuery, panels, { key: "title" })
            .map((searchResult) => searchResult.obj)
        : panels;
    },
    [searchQuery],
  );

  const { filteredRegularPanels, filteredPreconfiguredPanels } = React.useMemo(
    () => ({
      filteredRegularPanels: getFilteredPanels(allRegularPanels),
      filteredPreconfiguredPanels: getFilteredPanels(allPreconfiguredPanels),
    }),
    [getFilteredPanels, allRegularPanels, allPreconfiguredPanels],
  );

  const allFilteredPanels = React.useMemo(
    () => [...filteredPreconfiguredPanels, ...filteredRegularPanels],
    [filteredPreconfiguredPanels, filteredRegularPanels],
  );

  const highlightedPanel = React.useMemo(() => {
    return highlightedPanelIdx != undefined ? allFilteredPanels[highlightedPanelIdx] : undefined;
  }, [allFilteredPanels, highlightedPanelIdx]);

  const noResults = allFilteredPanels.length === 0;

  const onKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (mode === "grid") {
        return;
      }
      if (e.key === "ArrowDown") {
        setHighlightedPanelIdx((existing) => {
          if (existing == undefined) {
            return 0;
          }
          return (existing + 1) % allFilteredPanels.length;
        });
      } else if (e.key === "ArrowUp") {
        setHighlightedPanelIdx((existing) => {
          // nothing to highlight if there are no entries
          if (allFilteredPanels.length <= 0) {
            return undefined;
          }

          if (existing == undefined) {
            return allFilteredPanels.length - 1;
          }
          return (existing - 1 + allFilteredPanels.length) % allFilteredPanels.length;
        });
      } else if (e.key === "Enter" && highlightedPanel) {
        onPanelSelect({
          type: highlightedPanel.type,
          config: highlightedPanel.config,
          relatedConfigs: highlightedPanel.relatedConfigs,
        });
      }
    },
    [allFilteredPanels.length, highlightedPanel, mode, onPanelSelect],
  );

  const displayPanelListItem = React.useCallback(
    (panelInfo: PanelInfo) => {
      const { title, type, config, relatedConfigs } = panelInfo;
      return (
        <DraggablePanelItem
          mode={mode}
          key={`${type}-${title}`}
          mosaicId={mosaicId}
          panel={panelInfo}
          onDrop={onPanelMenuItemDrop}
          onClick={() => onPanelSelect({ type, config, relatedConfigs })}
          checked={title === selectedPanelTitle}
          highlighted={highlightedPanel?.title === title}
          searchQuery={searchQuery}
        />
      );
    },
    [
      mode,
      highlightedPanel,
      mosaicId,
      onPanelMenuItemDrop,
      onPanelSelect,
      searchQuery,
      selectedPanelTitle,
    ],
  );

  return (
    <div className={classes.fullHeight}>
      <AppBar
        className={cx(classes.appBar, { [classes.appBarBackground]: !props.backgroundColor })}
        position="sticky"
        color="transparent"
        elevation={0}
      >
        <Toolbar disableGutters className={classes.toolbar}>
          <div className={classes.inputWrapper}>
            <SearchIcon fontSize="small" color="primary" />
            <LegacyInput
              className={classes.searchInput}
              placeholder="Search panels"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={onKeyDown}
              onBlur={() => setHighlightedPanelIdx(undefined)}
              autoFocus
            />
          </div>
        </Toolbar>
      </AppBar>
      {mode === "grid" ? (
        <Container className={classes.grid} maxWidth={false}>
          {allFilteredPanels.map(displayPanelListItem)}
        </Container>
      ) : (
        <List dense disablePadding>
          {allFilteredPanels.map(displayPanelListItem)}
        </List>
      )}
      {noResults && <div className={classes.noResults}>No panels match search criteria.</div>}
    </div>
  );
}

export default PanelList;
