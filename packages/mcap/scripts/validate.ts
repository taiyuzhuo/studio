// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { program } from "commander";
import fs from "fs";
import { isEqual } from "lodash";
import { performance } from "perf_hooks";
import decompressLZ4 from "wasm-lz4";

import { parse as parseMessageDefinition, RosMsgDefinition } from "@foxglove/rosmsg";
import { MessageReader } from "@foxglove/rosmsg-serialization";
import { MessageReader as ROS2MessageReader } from "@foxglove/rosmsg2-serialization";

import { McapReader, parseRecord, McapRecord, ChannelInfo } from "../src";

// FIXME
/* eslint-disable no-restricted-syntax */

function die(message: string) {
  process.stderr.write(message);
  process.exit(1);
}

function formatBytes(totalBytes: number) {
  const units = ["B", "kiB", "MiB", "GiB", "TiB"];
  let bytes = totalBytes;
  let unit = 0;
  while (unit + 1 < units.length && bytes >= 1024) {
    bytes /= 1024;
    unit++;
  }
  return `${bytes.toFixed(2)}${units[unit]!}`;
}

async function validate(filePath: string, { deserialize }: { deserialize: boolean }) {
  console.log("Reading", filePath);
  await decompressLZ4.isLoaded;
  const reader = new McapReader();
  const stream = fs.createReadStream(filePath);

  const startTime = performance.now();
  let readBytes = 0n;

  let readHeader = false;
  let readFooter = false;

  const recordCounts = new Map<McapRecord["type"], number>();
  const channelInfoById = new Map<
    number,
    {
      info: ChannelInfo;
      messageDeserializer: ROS2MessageReader | MessageReader;
      parsedDefinitions: RosMsgDefinition[];
    }
  >();

  await new Promise<void>((resolve, reject) => {
    function processRecord(record: McapRecord) {
      recordCounts.set(record.type, (recordCounts.get(record.type) ?? 0) + 1);

      switch (record.type) {
        case "ChannelInfo": {
          const existingInfo = channelInfoById.get(record.id);
          if (existingInfo) {
            if (!isEqual(existingInfo.info, record)) {
              throw new Error(`differing channel infos for for ${record.id}`);
            }
            break;
          }
          let parsedDefinitions;
          let messageDeserializer;
          if (record.schemaFormat === "ros1") {
            parsedDefinitions = parseMessageDefinition(new TextDecoder().decode(record.schema));
            messageDeserializer = new MessageReader(parsedDefinitions);
          } else if (record.schemaFormat === "ros2") {
            parsedDefinitions = parseMessageDefinition(new TextDecoder().decode(record.schema), {
              ros2: true,
            });
            messageDeserializer = new ROS2MessageReader(parsedDefinitions);
          } else {
            throw new Error(`unsupported schema format ${record.schemaFormat}`);
          }
          channelInfoById.set(record.id, { info: record, messageDeserializer, parsedDefinitions });
          break;
        }

        case "Message": {
          const channelInfo = channelInfoById.get(record.channelId);
          if (!channelInfo) {
            throw new Error(`message for channel ${record.channelId} with no prior channel info`);
          }
          if (deserialize) {
            channelInfo.messageDeserializer.readMessage(new Uint8Array(record.data));
          }
          break;
        }
        case "Chunk": {
          let buffer = new Uint8Array(record.data);
          if (record.compression === "lz4") {
            buffer = decompressLZ4(buffer, Number(record.decompressedSize));
            //FIXME: check crc32
          } else if (record.compression !== "") {
            throw new Error(`Unsupported compression ${record.compression}`);
          }
          let offset = 0;
          const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
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
    stream.on("data", (data) => {
      try {
        if (typeof data === "string") {
          throw new Error("expected buffer");
        }
        if (readFooter) {
          throw new Error("already read footer");
        }
        readBytes += BigInt(data.byteLength);

        if (readFooter) {
          throw new Error("already read footer");
        }
        reader.append(data);
        if (!readHeader) {
          const magic = reader.readMagic();
          if (magic) {
            readHeader = true;
          } else {
            return;
          }
        }
        for (let record; (record = reader.readRecord()); ) {
          if (record.type === "Footer") {
            const magic = reader.readMagic();
            if (!magic) {
              throw new Error("missing trailing magic after footer record");
            }
            readFooter = true;
            break;
          } else {
            processRecord(record);
          }
        }
      } catch (error) {
        reject(error);
        stream.close();
      }
    });

    stream.on("error", (error) => reject(error));
    stream.on("close", () => resolve());
  });
  if (!readFooter) {
    die("missing footer");
  }
  if (reader.bytesRemaining() !== 0) {
    die(`${reader.bytesRemaining()} bytes remaining after parsing`);
  }

  const durationMs = performance.now() - startTime;
  console.log(
    `Read ${formatBytes(Number(readBytes))} in ${durationMs.toFixed(2)}ms (${formatBytes(
      Number(readBytes) / (durationMs / 1000),
    )}/sec)`,
  );
  console.log("Record counts:");
  for (const [type, count] of recordCounts) {
    console.log(`  ${count.toFixed().padStart(6, " ")} ${type}`);
  }
}

program
  .argument("<file>", "path to mcap file")
  .option("--deserialize", "deserialize message contents", false)
  .action((file: string, options: { deserialize: boolean }) => {
    validate(file, options).catch(console.error);
  })
  .parse();
