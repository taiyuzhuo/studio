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

import {
  Callout,
  ColorPicker,
  DirectionalHint,
  getColorFromRGBA,
  getColorFromString,
  IconButton,
  Stack,
  TextField,
  useTheme,
  Text,
} from "@fluentui/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLatest } from "react-use";
import { Color } from "regl-worldview";
import styled from "styled-components";

import AutoSizingCanvas from "@foxglove/studio-base/components/AutoSizingCanvas";
import {
  colorObjToIColor,
  defaultedRGBStringFromColorObj,
} from "@foxglove/studio-base/util/colorUtils";
import { colors, fonts } from "@foxglove/studio-base/util/sharedStyleConstants";

const GRADIENT_LINE_HEIGHT = 6;
const GRADIENT_LINE_WIDTH = 1;
const GRADIENT_COLOR_PICKER_SIZE = 25;
const GRADIENT_BAR_INSET = (GRADIENT_COLOR_PICKER_SIZE - GRADIENT_LINE_WIDTH) / 2;
const GRADIENT_BAR_HEIGHT = 10;
const GRADIENT_KNOB_SIZE = 15;
const GRADIENT_KNOB_SIZE_SELECTED = 20;

export default function GradientPicker({
  minColor,
  maxColor,
  onChange,
}: {
  minColor: Color;
  maxColor: Color;
  onChange: (arg0: { minColor: Color; maxColor: Color }) => void;
}): JSX.Element {
  const rgbMinColor = defaultedRGBStringFromColorObj(minColor);
  const rgbMaxColor = defaultedRGBStringFromColorObj(maxColor);
  const theme = useTheme();

  const [colorStops, setColorStops] = useState<readonly { position: number; color: string }[]>([
    { position: 0, color: colorObjToIColor(minColor).str },
    { position: 1, color: colorObjToIColor(maxColor).str },
  ]);

  //FIXME: maybe prevent dragging out of sorted order? then we wouldn't need auto-sorting and you'd be able to make 2 with the same offset...but then they'd be impossible to see on the scale :(

  const drawGradient = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      for (const { position, color } of colorStops) {
        gradient.addColorStop(position, color);
      }
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    },
    [colorStops],
  );

  const colorStopsRef = useLatest(colorStops);

  const onBarMouseDown = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      event.stopPropagation();
      const rect = event.currentTarget.getBoundingClientRect();
      const newPosition = (event.clientX - rect.left) / rect.width;
      const stops = [...colorStopsRef.current].sort((a, b) => a.position - b.position);
      let newColor = stops[0]?.color ?? "#7700ff";
      for (let i = 0; i < stops.length; i++) {
        if (stops[i]!.position > newPosition && i > 0) {
          const prevColor = getColorFromString(stops[i - 1]!.color);
          const nextColor = getColorFromString(stops[i]!.color);
          const fraction =
            (newPosition - stops[i - 1]!.position) / (stops[i]!.position - stops[i - 1]!.position);
          if (prevColor && nextColor) {
            newColor = getColorFromRGBA({
              r: Math.round(prevColor.r + fraction * (nextColor.r - prevColor.r)),
              g: Math.round(prevColor.g + fraction * (nextColor.g - prevColor.g)),
              b: Math.round(prevColor.b + fraction * (nextColor.b - prevColor.b)),
              a: Math.round(
                (prevColor.a ?? 100) + fraction * ((nextColor.a ?? 100) - (prevColor.a ?? 100)),
              ),
            }).str;
          }
          break;
        }
      }

      setColorStops(stops.concat({ position: newPosition, color: newColor }));
      setDraggingIndex(stops.length);
      setEditingIndex(stops.length);
    },
    [colorStopsRef],
  );

  const barRef = useRef<HTMLDivElement>(ReactNull);
  const [draggingIndex, setDraggingIndex] = useState<number | undefined>();
  const [editingIndex, setEditingIndex] = useState<number | undefined>();
  const editingStop = editingIndex != undefined ? colorStops[editingIndex] : undefined;
  const [editingPositionText, setEditingPositionText] = useState("");
  useEffect(() => {
    setEditingPositionText(editingStop?.position.toFixed(2) ?? "");
  }, [editingStop]);

  useEffect(() => {
    if (draggingIndex == undefined) {
      return;
    }
    const mouseMoveListener = (event: MouseEvent) => {
      if (!barRef.current) {
        return;
      }
      const barRect = barRef.current.getBoundingClientRect();
      const newPosition = Math.max(0, Math.min(1, (event.clientX - barRect.left) / barRect.width));
      setColorStops((stops) => {
        if (draggingIndex >= stops.length) {
          return stops;
        }
        return [
          ...stops.slice(0, draggingIndex),
          { ...stops[draggingIndex]!, position: newPosition },
          ...stops.slice(draggingIndex + 1),
        ];
      });
    };
    const mouseUpListener = (event: MouseEvent) => {
      console.log("mouseup!");
      setDraggingIndex(undefined);
      event.preventDefault();
    };
    // Use capture to avoid the Fluent ColorPicker stealing mouse events away while we are dragging the knob.
    document.addEventListener("mousemove", mouseMoveListener, { capture: true });
    document.addEventListener("mouseup", mouseUpListener, { capture: true });
    return () => {
      document.removeEventListener("mousemove", mouseMoveListener, { capture: true });
      document.removeEventListener("mouseup", mouseUpListener, { capture: true });
    };
  }, [draggingIndex]);

  const onKnobMouseDown = useCallback((event: React.MouseEvent<HTMLElement>, index: number) => {
    event.stopPropagation();
    setDraggingIndex(index);
    setEditingIndex(index);
  }, []);

  const onKnobDoubleClick = useCallback((event: React.MouseEvent<HTMLElement>, index: number) => {
    setEditingIndex(undefined);
    setDraggingIndex(undefined);
    setColorStops((stops) => {
      //FIXME: prevent delete first/last unsorted?
      return [...stops.slice(0, index), ...stops.slice(index + 1)];
    });
  }, []);

  const calloutTarget = useMemo(() => {
    if (!barRef.current || !editingStop) {
      return undefined;
    }
    const barRect = barRef.current.getBoundingClientRect();
    const padding = 2;
    return {
      left: barRect.left + editingStop.position * barRect.width,
      top: barRect.top + barRect.height / 2 + GRADIENT_KNOB_SIZE_SELECTED / 2 + padding,
    };
  }, [editingStop]);

  return (
    <div
      style={{ position: "relative", height: GRADIENT_BAR_HEIGHT, display: "flex" }}
      onMouseDown={onBarMouseDown}
      ref={barRef}
    >
      <AutoSizingCanvas draw={drawGradient} />
      {colorStops.map(({ position, color }, index) => {
        const isSelected = index === draggingIndex || index === editingIndex;
        return (
          <div
            key={index}
            style={{
              backgroundColor: color,
              position: "absolute",
              top: "50%",
              left: `${position * 100}%`,
              transform: "translateX(-50%) translateY(-50%)",
              width: isSelected ? GRADIENT_KNOB_SIZE_SELECTED : GRADIENT_KNOB_SIZE,
              height: isSelected ? GRADIENT_KNOB_SIZE_SELECTED : GRADIENT_KNOB_SIZE,
              borderRadius: "50%",
              border: isSelected ? "2px solid gold" : "2px solid white",
              boxShadow: "rgba(0,0,0,70%) 0 0 5px",
            }}
            onMouseDown={(event) => onKnobMouseDown(event, index)}
            onDoubleClick={(event) => onKnobDoubleClick(event, index)}
          />
        );
      })}
      {editingStop != undefined && barRef.current != undefined && (
        <Callout
          directionalHint={DirectionalHint.bottomCenter}
          directionalHintFixed
          target={calloutTarget}
          onDismiss={() => {
            setEditingIndex(undefined);
          }}
        >
          <Stack>
            <Stack
              horizontal
              verticalAlign="baseline"
              tokens={{
                padding: `${theme.spacing.m} ${theme.spacing.m} 0 ${theme.spacing.m}`,
                childrenGap: theme.spacing.s1,
              }}
            >
              <Text>Offset:</Text>
              <TextField
                styles={{ root: { width: 70 } }}
                value={editingPositionText}
                onGetErrorMessage={(value) => (isNaN(parseFloat(value)) ? "Must be a number" : "")}
                onChange={(_event, newValue) => {
                  // FIXME: deleting character leads to replacing text in field... do we need to use defaultValue? but then can't reset when you drag
                  if (newValue == undefined) {
                    return;
                  }
                  setEditingPositionText(newValue);
                  const newPosition = Math.max(0, Math.min(1, parseFloat(newValue)));
                  if (!isNaN(newPosition)) {
                    setColorStops((stops) => {
                      if (editingIndex == undefined || editingIndex >= stops.length) {
                        return stops;
                      }
                      return [
                        ...stops.slice(0, editingIndex),
                        { ...stops[editingIndex]!, position: newPosition },
                        ...stops.slice(editingIndex + 1),
                      ];
                    });
                  }
                }}
              />
              <div style={{ flexGrow: 1 }} />
              <IconButton
                iconProps={{ iconName: "Delete" }}
                onClick={() =>
                  setColorStops((stops) => {
                    if (editingIndex == undefined || editingIndex >= stops.length) {
                      return stops;
                    }
                    return [...stops.slice(0, editingIndex), ...stops.slice(editingIndex + 1)];
                  })
                }
              />
            </Stack>
            <ColorPicker
              color={editingStop.color}
              alphaType="none"
              styles={{
                tableHexCell: { width: "35%" },
                input: {
                  input: {
                    fontFeatureSettings: `${fonts.SANS_SERIF_FEATURE_SETTINGS}, 'zero'`,
                  },
                },
              }}
              onChange={(_event, newColor) =>
                setColorStops((stops) => {
                  if (editingIndex == undefined || editingIndex >= stops.length) {
                    return stops;
                  }
                  return [
                    ...stops.slice(0, editingIndex),
                    { ...stops[editingIndex]!, color: newColor.str },
                    ...stops.slice(editingIndex + 1),
                  ];
                })
              }
            />
          </Stack>
        </Callout>
      )}
    </div>
  );
}
