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

import { last } from "lodash";

import { Time, compare, isGreaterThan, isLessThan } from "@foxglove/rostime";
import {
  Topic,
  MessageDefinitionsByTopic,
  MessageEvent,
} from "@foxglove/studio-base/players/types";
import {
  ExtensionPoint,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
  RandomAccessDataProvider,
  MessageDefinitions,
} from "@foxglove/studio-base/randomAccessDataProviders/types";
import { RosDatatypes } from "@foxglove/studio-base/types/RosDatatypes";

function filterMessages<T>(
  start: Time,
  end: Time,
  topics: readonly string[],
  messages: readonly MessageEvent<T>[] | undefined,
) {
  if (messages == undefined) {
    return undefined;
  }
  const ret = [];
  for (const message of messages) {
    if (isGreaterThan(message.receiveTime, end)) {
      break;
    }
    if (isLessThan(message.receiveTime, start)) {
      continue;
    }
    if (!topics.includes(message.topic)) {
      continue;
    }
    ret.push(message);
  }
  return ret;
}

type MemoryDataProviderOptions = {
  messages: GetMessagesResult;
  topics?: Topic[];
  datatypes?: RosDatatypes;
  messageDefinitionsByTopic?: MessageDefinitionsByTopic;
  initiallyLoaded?: boolean;
};

// in-memory data provider for tests
// ts-prune-ignore-next
export default class MemoryDataProvider implements RandomAccessDataProvider {
  messages: GetMessagesResult;
  topics?: Topic[];
  datatypes?: RosDatatypes;
  messageDefinitionsByTopic: MessageDefinitionsByTopic;
  extensionPoint?: ExtensionPoint;
  initiallyLoaded: boolean;

  constructor({
    messages,
    topics,
    datatypes,
    initiallyLoaded = false,
    messageDefinitionsByTopic,
  }: MemoryDataProviderOptions) {
    this.messages = messages;
    this.topics = topics;
    this.datatypes = datatypes;
    this.messageDefinitionsByTopic = messageDefinitionsByTopic ?? {};
    this.initiallyLoaded = initiallyLoaded;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this.extensionPoint = extensionPoint;

    if (!this.initiallyLoaded) {
      // Report progress during `initialize` to state intention to provide progress (for testing)
      this.extensionPoint.progressCallback({
        fullyLoadedFractionRanges: [{ start: 0, end: 0 }],
      });
    }
    const { parsedMessages, rosBinaryMessages } = this.messages;
    const sortedMessages = [...(parsedMessages ?? []), ...(rosBinaryMessages ?? [])].sort(
      (m1, m2) => compare(m1.receiveTime, m2.receiveTime),
    );

    let messageDefinitions: MessageDefinitions;
    if (this.datatypes) {
      messageDefinitions = {
        datatypes: this.datatypes ?? new Map(),
        messageDefinitionsByTopic: this.messageDefinitionsByTopic,
      };
    } else {
      messageDefinitions = {
        type: "raw",
        messageDefinitionsByTopic: this.messageDefinitionsByTopic,
      };
    }

    const firstSortedMessage = sortedMessages[0];
    const lastReceiveTime = last(sortedMessages)?.receiveTime;
    if (!lastReceiveTime || !firstSortedMessage) {
      throw new Error("MemoryDataProvider invariant: no sorted messages");
    }

    return {
      start: firstSortedMessage.receiveTime,
      end: lastReceiveTime,
      topics: this.topics ?? [],
      connections: [],
      messageDefinitions,
      problems: [],
    };
  }

  async close(): Promise<void> {
    // no-op
  }

  async getMessages(start: Time, end: Time, topics: GetMessagesTopics): Promise<GetMessagesResult> {
    return {
      parsedMessages: filterMessages(
        start,
        end,
        topics.parsedMessages ?? [],
        this.messages.parsedMessages,
      ),
      rosBinaryMessages: filterMessages(
        start,
        end,
        topics.rosBinaryMessages ?? [],
        this.messages.rosBinaryMessages,
      ),
    };
  }
}
