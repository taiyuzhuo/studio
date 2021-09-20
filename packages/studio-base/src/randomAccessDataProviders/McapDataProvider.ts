// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import decompressLZ4 from "wasm-lz4";

import Logger from "@foxglove/log";
import { ChannelInfo, McapReader, McapRecord, parseRecord } from "@foxglove/mcap";
import { parse as parseMessageDefinition, RosMsgDefinition } from "@foxglove/rosmsg";
import { LazyMessageReader } from "@foxglove/rosmsg-serialization";
import { MessageReader as ROS2MessageReader } from "@foxglove/rosmsg2-serialization";
import {
  Time,
  compare,
  isLessThan,
  isGreaterThan,
  isTimeInRangeInclusive,
} from "@foxglove/rostime";
import {
  MessageDefinitionsByTopic,
  MessageEvent,
  ParsedMessageDefinitionsByTopic,
  Topic,
} from "@foxglove/studio-base/players/types";
import {
  RandomAccessDataProvider,
  RandomAccessDataProviderDescriptor,
  ExtensionPoint,
  GetMessagesResult,
  GetMessagesTopics,
  InitializationResult,
  Connection,
} from "@foxglove/studio-base/randomAccessDataProviders/types";

type Options = { blob: Blob };

const log = Logger.getLogger(__filename);

// Read from a ROS Bag. `bagPath` can either represent a local file, or a remote bag. See
// `BrowserHttpReader` for how to set up a remote server to be able to directly stream from it.
// Returns raw messages that still need to be parsed by `ParseMessagesDataProvider`.
export default class McapDataProvider implements RandomAccessDataProvider {
  private options: Options;
  private extensionPoint?: ExtensionPoint;
  private messagesByChannel?: Map<number, MessageEvent<unknown>[]>;

  constructor(options: Options, children: RandomAccessDataProviderDescriptor[]) {
    if (children.length > 0) {
      throw new Error("McapDataProvider cannot have children");
    }
    this.options = options;
  }

  async initialize(extensionPoint: ExtensionPoint): Promise<InitializationResult> {
    this.extensionPoint = extensionPoint;
    const { blob } = this.options;
    await decompressLZ4.isLoaded;

    const reader = new McapReader();
    const streamReader = (blob.stream() as ReadableStream<Uint8Array>).getReader();

    const messagesByChannel = new Map<number, MessageEvent<unknown>[]>();
    const channelInfoById = new Map<
      number,
      {
        info: ChannelInfo;
        messageDeserializer: ROS2MessageReader | LazyMessageReader;
        parsedDefinitions: RosMsgDefinition[];
      }
    >();

    let startTime: Time | undefined;
    let endTime: Time | undefined;
    let readHeader = false;
    let readFooter = false;
    function processRecord(record: McapRecord) {
      switch (record.type) {
        case "ChannelInfo": {
          if (channelInfoById.has(record.id)) {
            throw new Error(`duplicate channel info for ${record.id}`);
          }
          let parsedDefinitions;
          let messageDeserializer;
          if (record.schemaFormat === "ros1") {
            parsedDefinitions = parseMessageDefinition(new TextDecoder().decode(record.schema));
            messageDeserializer = new LazyMessageReader(parsedDefinitions);
          } else if (record.schemaFormat === "ros2") {
            parsedDefinitions = parseMessageDefinition(new TextDecoder().decode(record.schema), {
              ros2: true,
            });
            messageDeserializer = new ROS2MessageReader(parsedDefinitions);
          } else {
            throw new Error(`unsupported schema format ${record.schemaFormat}`);
          }
          channelInfoById.set(record.id, { info: record, messageDeserializer, parsedDefinitions });
          messagesByChannel.set(record.id, []);
          break;
        }

        case "Message": {
          const channelInfo = channelInfoById.get(record.channelId);
          const messages = messagesByChannel.get(record.channelId);
          if (!channelInfo || !messages) {
            throw new Error(`message for channel ${record.channelId} with no prior channel info`);
          }
          const receiveTime = {
            sec: Number(record.timestamp / 1_000_000_000n),
            nsec: Number(record.timestamp % 1_000_000_000n),
          };
          if (!startTime || isLessThan(receiveTime, startTime)) {
            startTime = receiveTime;
          }
          if (!endTime || isGreaterThan(receiveTime, endTime)) {
            endTime = receiveTime;
          }
          messages.push({
            topic: channelInfo.info.topic,
            receiveTime,
            message: channelInfo.messageDeserializer.readMessage(new Uint8Array(record.data)),
          });
          break;
        }
        case "Chunk": {
          let buffer = new Uint8Array(record.data);
          if (record.compression === "lz4") {
            buffer = decompressLZ4(buffer, Number(record.decompressedSize));
            //FIXME: check crc32
          }
          let offset = 0;
          const view = new DataView(buffer.buffer);
          for (
            let subRecord, usedBytes;
            ({ record: subRecord, usedBytes } = parseRecord(view, offset)), subRecord;

          ) {
            processRecord(subRecord);
            offset += usedBytes;
          }
          break;
        }
        case "IndexData":
          throw new Error("not yet implemented");
        case "ChunkInfo":
          throw new Error("not yet implemented");
        case "Footer":
          throw new Error("unexpected footer record");
      }
    }
    for (let result; (result = await streamReader.read()), !result.done; ) {
      if (readFooter) {
        throw new Error("already read footer");
      }
      reader.append(result.value);
      if (!readHeader) {
        const magic = reader.readMagic();
        if (magic) {
          if (magic.formatVersion !== 1) {
            throw new Error("unsupported format version");
          }
          readHeader = true;
        }
      }
      for (let record; (record = reader.readRecord()); ) {
        if (record.type === "Footer") {
          const magic = reader.readMagic();
          if (!magic) {
            throw new Error("missing trailing magic after footer record");
          }
          if (magic.formatVersion !== 1) {
            throw new Error("unsupported format version");
          }
          readFooter = true;
          break;
        } else {
          processRecord(record);
        }
      }
    }

    this.messagesByChannel = messagesByChannel;

    const topics: Topic[] = [];
    const connections: Connection[] = [];
    const messageDefinitionsByTopic: MessageDefinitionsByTopic = {};
    const parsedMessageDefinitionsByTopic: ParsedMessageDefinitionsByTopic = {};

    for (const { info, parsedDefinitions } of channelInfoById.values()) {
      topics.push({
        name: info.topic,
        datatype: "TODO", //FIXME
      });
      const messageDefinition = new TextDecoder().decode(info.schema);
      connections.push({
        topic: info.topic,
        messageDefinition,
        md5sum: "",
        type: "",
        callerid: "",
      });
      messageDefinitionsByTopic[info.topic] = messageDefinition;
      parsedMessageDefinitionsByTopic[info.topic] = parsedDefinitions;
    }

    return {
      start: startTime ?? { sec: 0, nsec: 0 },
      end: endTime ?? { sec: 0, nsec: 0 },
      topics,
      connections,
      providesParsedMessages: true,
      messageDefinitions: {
        type: "raw",
        messageDefinitionsByTopic,
      },
      problems: [],
    };
  }

  async getMessages(
    start: Time,
    end: Time,
    subscriptions: GetMessagesTopics,
  ): Promise<GetMessagesResult> {
    if (!this.messagesByChannel) {
      throw new Error("initialization not completed");
    }
    const topics = subscriptions.parsedMessages;
    if (topics == undefined) {
      return {};
    }

    const parsedMessages: MessageEvent<unknown>[] = [];
    for (const messages of this.messagesByChannel.values()) {
      for (const message of messages) {
        if (isTimeInRangeInclusive(message.receiveTime, start, end)) {
          parsedMessages.push(message);
        }
      }
    }
    parsedMessages.sort((msg1, msg2) => compare(msg1.receiveTime, msg2.receiveTime));

    return { parsedMessages };
  }

  async close(): Promise<void> {
    // no-op
  }
}
