// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Icon, useTheme } from "@fluentui/react";
import { Box, Divider } from "@mui/material";
import { useCallback, useContext } from "react";

import {
  MessagePipelineContext,
  useMessagePipeline,
} from "@foxglove/studio-base/components/MessagePipeline";
import NotificationModal from "@foxglove/studio-base/components/NotificationModal";
import ModalContext from "@foxglove/studio-base/context/ModalContext";
import { PlayerProblem } from "@foxglove/studio-base/players/types";

import { DataSourceInfo } from "./DataSourceInfo";

const selectPlayerProblems = (ctx: MessagePipelineContext) => ctx.playerState.problems;

const emptyArray: PlayerProblem[] = [];

export default function ConnectionList(): JSX.Element {
  const modalHost = useContext(ModalContext);
  const theme = useTheme();

  const playerProblems = useMessagePipeline(selectPlayerProblems) ?? emptyArray;

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

  return (
    <>
      <DataSourceInfo />
      {playerProblems.length > 0 && <Divider sx={{ marginY: 1 }} />}
      {playerProblems.map((problem, idx) => {
        const iconName = problem.severity === "error" ? "Error" : "Warning";
        const color =
          problem.severity === "error"
            ? theme.semanticColors.errorBackground
            : theme.semanticColors.warningBackground;
        return (
          <Box
            key={idx}
            padding={1}
            sx={{ color, cursor: "pointer" }}
            onClick={() => showProblemModal(problem)}
          >
            <Icon iconName={iconName} />
            &nbsp;
            {problem.message}
          </Box>
        );
      })}
    </>
  );
}
