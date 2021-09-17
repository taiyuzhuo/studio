// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { EventNames, EventEmitter, EventListener } from "eventemitter3";

import GrowableBuffer from "./GrowableBuffer";

export enum RecordType {
  CHANNEL_INFO = 0x01,
  MESSAGE = 0x02,
  CHUNK = 0x03,
  INDEX_DATA = 0x04,
  CHUNK_INFO = 0x05,
  FOOTER = 0x06,
}

/** Array.from("\x89MCAP\r\n\n", (c) => c.charCodeAt(0)) */
export const MCAP_MAGIC = Object.freeze([137, 77, 67, 65, 80, 13, 10, 10]);

export type McapParserEventTypes = {
  header: () => void;

  error: (error: Error) => void;

  channelInfo: (_: {
    id: number;
    topic: string;
    serializationFormat: string;
    schemaFormat: string;
    schema: ArrayBuffer;
    data: ArrayBuffer;
  }) => void;

  message: (_: { channelId: number; timestamp: bigint; data: ArrayBuffer }) => void;

  footer: (_: { indexPos: bigint; indexCrc: number }) => void;

  complete: () => void;
};

export default class McapStreamingParser {
  private emitter = new EventEmitter<McapParserEventTypes>();
  constructor() {}

  on<E extends EventNames<McapParserEventTypes>>(
    name: E,
    listener: EventListener<McapParserEventTypes, E>,
  ): void {
    this.emitter.on(name, listener);
  }
  off<E extends EventNames<McapParserEventTypes>>(
    name: E,
    listener: EventListener<McapParserEventTypes, E>,
  ): void {
    this.emitter.off(name, listener);
  }

  private generator = this.read();
  private requestedLength = this.generator.next().value;
  private buffer = new GrowableBuffer(MCAP_MAGIC.length);
  feed(data: Uint8Array): void {
    try {
      let offset = 0;
      while (offset < data.length) {
        if (typeof this.requestedLength !== "number") {
          throw new Error("No more data requested");
        }
        const length = this.requestedLength - this.buffer.length;
        this.buffer.append(data.slice(offset, offset + length));
        offset += length;
        if (offset > data.length) {
          return;
        }
        const result = this.generator.next(this.buffer.slice(0, this.buffer.length).buffer);
        this.buffer.clear();
        this.requestedLength = result.value;
      }
    } catch (error) {
      this.emitter.emit("error", error as Error);
    }
  }

  static verifyMagic(buffer: ArrayBuffer): void {
    const data = new Uint8Array(buffer);
    if (data.length !== MCAP_MAGIC.length) {
      throw new Error(`Expected ${MCAP_MAGIC.length} magic bytes, got ${data.length}`);
    }
    if (!MCAP_MAGIC.every((val, i) => val === data[i])) {
      throw new Error(
        `Expected MCAP magic '${MCAP_MAGIC.map((val) => val.toString(16).padStart(2, "0")).join(
          " ",
        )}', found '${Array.from(data, (val) => val.toString(16).padStart(2, "0")).join(" ")}'`,
      );
    }
  }

  private *read({ inChunk = false }: { inChunk?: boolean } = {}): Generator<
    number,
    void,
    ArrayBuffer
  > {
    if (!inChunk) {
      McapStreamingParser.verifyMagic(yield MCAP_MAGIC.length);
      this.emitter.emit("header");
    }

    for (;;) {
      switch (new Uint8Array(yield 1)[0]!) {
        case RecordType.CHANNEL_INFO: {
          const recordLen = new DataView(yield 4).getUint32(0, true);
          const recordData = new DataView(yield recordLen);
          let offset = 0;
          const id = recordData.getUint32(offset, true);
          offset += 4;
          const topicLength = recordData.getUint32(offset, true);
          offset += 4;
          const topic = new TextDecoder().decode(
            recordData.buffer.slice(offset, offset + topicLength),
          );
          offset += topicLength;
          const serializationFormatLen = recordData.getUint32(offset, true);
          offset += 4;
          const serializationFormat = new TextDecoder().decode(
            recordData.buffer.slice(offset, offset + serializationFormatLen),
          );
          offset += serializationFormatLen;
          const schemaFormatLen = recordData.getUint32(offset, true);
          offset += 4;
          const schemaFormat = new TextDecoder().decode(
            recordData.buffer.slice(offset, offset + schemaFormatLen),
          );
          offset += schemaFormatLen;
          const schemaLen = recordData.getUint32(offset, true);
          offset += 4;
          const schema = recordData.buffer.slice(offset, offset + schemaLen);
          offset += schemaLen;
          const data = recordData.buffer.slice(offset);

          this.emitter.emit("channelInfo", {
            id,
            topic,
            serializationFormat,
            schemaFormat,
            schema,
            data,
          });
          break;
        }

        case RecordType.MESSAGE: {
          const recordLen = new DataView(yield 4).getUint32(0, true);
          const recordData = new DataView(yield recordLen);
          let offset = 0;
          const channelId = recordData.getUint32(offset, true);
          offset += 4;
          const timestamp = recordData.getBigUint64(offset, true);
          offset += 8;

          this.emitter.emit("message", {
            channelId,
            timestamp,
            data: recordData.buffer.slice(offset),
          });
          break;
        }

        case RecordType.CHUNK: {
          if (inChunk) {
            throw new Error("Chunk record not allowed inside a chunk");
          }
          const recordLen = new DataView(yield 4).getUint32(0, true);
          const recordData = new DataView(yield recordLen);
          let offset = 0;
          const decompressedSize = recordData.getBigUint64(offset, true);
          offset += 8;
          const decompressedCrc32 = recordData.getUint32(offset, true);
          offset += 4;
          const compressionLen = recordData.getUint32(offset, true);
          offset += 4;
          const compression = new TextDecoder().decode(
            recordData.buffer.slice(offset, offset + compressionLen),
          );
          offset += compressionLen;
          if (compression !== "") {
            void decompressedSize;
            void decompressedCrc32;
            throw new Error(`Unsupported compression: ${compression}`);
          }

          // Recursively read chunk contents
          if (offset < recordData.byteLength) {
            const generator = this.read({ inChunk: true });
            let result = generator.next();
            while (result.done !== true) {
              const requestedLength = result.value;
              if (offset + requestedLength > recordData.byteLength) {
                throw new Error(
                  `Not enough data to read ${requestedLength} bytes in chunk (chunk length ${recordData.byteLength}, offset ${offset})`,
                );
              }
              result = generator.next(recordData.buffer.slice(offset, offset + requestedLength));
              offset += requestedLength;
            }
          }
          break;
        }

        case RecordType.INDEX_DATA:
          if (inChunk) {
            throw new Error("Index data record not allowed inside a chunk");
          }
          throw new Error("Not yet implemented");

        case RecordType.CHUNK_INFO:
          if (inChunk) {
            throw new Error("Chunk info record not allowed inside a chunk");
          }
          throw new Error("Not yet implemented");

        case RecordType.FOOTER: {
          if (inChunk) {
            throw new Error("Footer not allowed inside a chunk");
          }
          let offset = 0;
          const data = new DataView(yield 12);
          const indexPos = data.getBigUint64(offset, true);
          offset += 8;
          const indexCrc = data.getUint32(offset, true);
          offset += 4;

          this.emitter.emit("footer", { indexPos, indexCrc });

          McapStreamingParser.verifyMagic(yield MCAP_MAGIC.length);
          this.emitter.emit("complete");
          return;
        }
      }
    }
  }
}
