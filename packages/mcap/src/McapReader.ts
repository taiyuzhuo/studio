// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ByteStorage from "./ByteStorage";
import { MCAP_MAGIC, RecordType } from "./constants";

type Header = { type: "Header" };
type ChannelInfo = {
  type: "ChannelInfo";
  id: number;
  topic: string;
  serializationFormat: string;
  schemaFormat: string;
  schema: ArrayBuffer;
  data: ArrayBuffer;
};
type Message = { type: "Message"; channelId: number; timestamp: bigint; data: ArrayBuffer };
type Chunk = { type: "Chunk" };
type IndexData = { type: "IndexData" };
type ChunkInfo = { type: "ChunkInfo" };
type Footer = { type: "Footer"; indexPos: bigint; indexCrc: number };

type McapRecord = ChannelInfo | Message | Chunk | IndexData | ChunkInfo | Footer;

export default class McapReader {
  private storage = new ByteStorage(MCAP_MAGIC.length * 2);

  private currentChunk?: DataView;
  private offsetInChunk = 0;

  constructor() {}

  append(data: Uint8Array): void {
    this.storage.append(data);
  }

  readHeader(): Header | undefined {
    if (!this.storage.hasBytes(MCAP_MAGIC.length)) {
      return undefined;
    }

    if (!MCAP_MAGIC.every((val, i) => val === this.storage.view.getUint8(i))) {
      throw new Error(
        `Expected MCAP magic '${MCAP_MAGIC.map((val) => val.toString(16).padStart(2, "0")).join(
          " ",
        )}', found '${Array.from(MCAP_MAGIC, (_, i) =>
          this.storage.view.getUint8(i).toString(16).padStart(2, "0"),
        ).join(" ")}'`,
      );
    }

    this.storage.consume(MCAP_MAGIC.length);
    return { type: "Header" };
  }

  readRecord(): McapRecord | undefined {
    if (!this.storage.hasBytes(5)) {
      return undefined;
    }
    let offset = 0;
    const typeByte = this.storage.view.getUint8(offset);
    offset += 1;
    if (typeByte < RecordType.MIN || typeByte > RecordType.MAX) {
      throw new Error(`Invalid record type ${typeByte}`);
    }
    const type = typeByte as RecordType;

    // Footer doesn't have an encoded length because it's always a fixed length.
    if (type === RecordType.FOOTER) {
      if (!this.storage.hasBytes(13)) {
        return;
      }
      const indexPos = this.storage.view.getBigUint64(offset, true);
      offset += 8;
      const indexCrc = this.storage.view.getUint32(offset, true);
      offset += 4;
      this.storage.consume(offset);
      return { type: "Footer", indexPos, indexCrc };
    }

    const recordLen = this.storage.view.getUint32(offset, true);
    offset += 4;
    if (!this.storage.hasBytes(5 + recordLen)) {
      return undefined;
    }

    // At this point we have enough data to read the whole record.
    const result = this.readRecordInView(
      type,
      new DataView(this.storage.view.buffer, this.storage.view.byteOffset + 5, recordLen),
    );
    this.storage.consume(5 + recordLen);
    return result;
  }

  private readRecordInView(
    recordType: Exclude<RecordType, RecordType.FOOTER>,
    view: DataView,
  ): McapRecord | undefined {
    let offset = 0;
    switch (recordType) {
      case RecordType.CHANNEL_INFO: {
        const id = view.getUint32(offset, true);
        offset += 4;
        const topicLength = view.getUint32(offset, true);
        offset += 4;
        const topic = new TextDecoder().decode(
          new DataView(view.buffer, view.byteOffset + offset, topicLength),
        );
        offset += topicLength;
        const serializationFormatLen = view.getUint32(offset, true);
        offset += 4;
        const serializationFormat = new TextDecoder().decode(
          new DataView(view.buffer, view.byteOffset + offset, serializationFormatLen),
        );
        offset += serializationFormatLen;
        const schemaFormatLen = view.getUint32(offset, true);
        offset += 4;
        const schemaFormat = new TextDecoder().decode(
          new DataView(view.buffer, view.byteOffset + offset, schemaFormatLen),
        );
        offset += schemaFormatLen;
        const schemaLen = view.getUint32(offset, true);
        offset += 4;
        const schema = view.buffer.slice(
          view.byteOffset + offset,
          view.byteOffset + offset + schemaLen,
        );
        offset += schemaLen;
        const data = view.buffer.slice(
          view.byteOffset + offset,
          view.byteOffset + 5 + view.byteLength,
        );

        return { type: "ChannelInfo", id, topic, serializationFormat, schemaFormat, schema, data };
      }

      case RecordType.MESSAGE: {
        const channelId = view.getUint32(offset, true);
        offset += 4;
        const timestamp = view.getBigUint64(offset, true);
        offset += 8;
        const data = view.buffer.slice(
          view.byteOffset + offset,
          view.byteOffset + 5 + view.byteLength,
        );

        return { type: "Message", channelId, timestamp, data };
      }

      case RecordType.CHUNK: {
        // for (let offsetInChunk = 0; offsetInChunk < view.byteLength; ) {
        //   const typeByte = view.getUint8(offsetInChunk);
        //   offsetInChunk += 1;
        //   if (typeByte < RecordType.MIN || typeByte > RecordType.MAX) {
        //     throw new Error(`Invalid record type ${typeByte}`);
        //   }
        //   const type = typeByte as RecordType;
        //   if (type !== RecordType.CHANNEL_INFO && type !== RecordType.MESSAGE) {
        //     throw new Error(/*FIXME*/);
        //   }
        //   const recordLen = view.getUint32(offsetInChunk, true);
        //   offsetInChunk += 4;
        //   if (offsetInChunk + recordLen > view.byteLength) {
        //     throw new Error(/*FIXME*/);
        //   }
        // }
        throw new Error("Not yet implemented");
      }

      case RecordType.INDEX_DATA:
        throw new Error("Not yet implemented");

      case RecordType.CHUNK_INFO:
        throw new Error("Not yet implemented");
    }
  }
}
