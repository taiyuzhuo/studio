// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ByteStorage from "./ByteStorage";
import { MCAP_MAGIC, RecordType } from "./constants";

type Magic = {
  type: "Magic";
  formatVersion: 1;
};
type ChannelInfo = {
  type: "ChannelInfo";
  id: number;
  topic: string;
  serializationFormat: string;
  schemaFormat: string;
  schema: ArrayBuffer;
  data: ArrayBuffer;
};
type Message = {
  type: "Message";
  channelId: number;
  timestamp: bigint;
  data: ArrayBuffer;
};
type Chunk = {
  type: "Chunk";
  compression: string;
  decompressedSize: bigint;
  decompressedCrc: number;
  data: ArrayBuffer;
};
type IndexData = {
  type: "IndexData";
};
type ChunkInfo = {
  type: "ChunkInfo";
};
type Footer = {
  type: "Footer";
  indexPos: bigint;
  indexCrc: number;
};

type McapRecord = ChannelInfo | Message | Chunk | IndexData | ChunkInfo | Footer;

export default class McapReader {
  private storage = new ByteStorage(MCAP_MAGIC.length * 2);

  constructor() {}

  append(data: Uint8Array): void {
    this.storage.append(data);
  }

  readMagic(): Magic | undefined {
    if (!this.storage.hasBytes(MCAP_MAGIC.length + 1)) {
      return undefined;
    }

    verifyMagic(this.storage.view, 0);

    const formatVersion = this.storage.view.getUint8(MCAP_MAGIC.length);
    if (formatVersion !== 1) {
      throw new Error(`Unsupported format version ${formatVersion}`);
    }
    this.storage.consume(MCAP_MAGIC.length + 1);
    return { type: "Magic", formatVersion };
  }

  readRecord(): McapRecord | undefined {
    const result = parseRecord(this.storage.view, 0);
    if (result.record) {
      this.storage.consume(result.usedBytes);
      return result.record;
    }
    return undefined;
  }

  atEnd(): boolean {
    return this.storage.atEnd();
  }
}

export function verifyMagic(view: DataView, startOffset: number): void {
  if (!MCAP_MAGIC.every((val, i) => val === view.getUint8(startOffset + i))) {
    throw new Error(
      `Expected MCAP magic '${MCAP_MAGIC.map((val) => val.toString(16).padStart(2, "0")).join(
        " ",
      )}', found '${Array.from(MCAP_MAGIC, (_, i) =>
        view.getUint8(i).toString(16).padStart(2, "0"),
      ).join(" ")}'`,
    );
  }
}

/**
 * Parse a MCAP record or footer beginning at `startOffset` in `view`.
 */
export function parseRecord(
  view: DataView,
  startOffset: number,
): { record: McapRecord; usedBytes: number } | { record?: undefined; usedBytes: 0 } {
  let offset = startOffset;

  const typeByte = view.getUint8(offset);
  offset += 1;
  if (typeByte < RecordType.MIN || typeByte > RecordType.MAX) {
    throw new Error(`Invalid record type ${typeByte}`);
  }
  const type = typeByte as RecordType;

  // Footer doesn't have an encoded length because it's always a fixed length.
  if (type === RecordType.FOOTER) {
    if (offset + 12 > view.byteLength) {
      return { usedBytes: 0 };
    }
    const indexPos = view.getBigUint64(offset, true);
    offset += 8;
    const indexCrc = view.getUint32(offset, true);
    offset += 4;

    const record: McapRecord = { type: "Footer", indexPos, indexCrc };
    return { record, usedBytes: offset };
  }

  const recordLength = view.getUint32(offset, true);
  offset += 4;
  const recordEndOffset = offset + recordLength;
  if (offset + recordLength > view.byteLength) {
    return { usedBytes: 0 };
  }

  switch (type) {
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
      const data = view.buffer.slice(view.byteOffset + offset, view.byteOffset + recordEndOffset);

      const record: McapRecord = {
        type: "ChannelInfo",
        id,
        topic,
        serializationFormat,
        schemaFormat,
        schema,
        data,
      };
      return { record, usedBytes: recordEndOffset };
    }

    case RecordType.MESSAGE: {
      const channelId = view.getUint32(offset, true);
      offset += 4;
      const timestamp = view.getBigUint64(offset, true);
      offset += 8;
      const data = view.buffer.slice(view.byteOffset + offset, view.byteOffset + recordEndOffset);

      const record: McapRecord = { type: "Message", channelId, timestamp, data };
      return { record, usedBytes: recordEndOffset };
    }

    case RecordType.CHUNK: {
      const decompressedSize = view.getBigUint64(offset, true);
      offset += 8;
      const decompressedCrc = view.getUint32(offset, true);
      offset += 4;
      const compressionLen = view.getUint32(offset, true);
      offset += 4;
      const compression = new TextDecoder().decode(
        new DataView(view.buffer, view.byteOffset + offset, compressionLen),
      );
      offset += compressionLen;
      const data = view.buffer.slice(view.byteOffset + offset, view.byteOffset + recordEndOffset);

      const record: McapRecord = {
        type: "Chunk",
        compression,
        decompressedSize,
        decompressedCrc,
        data,
      };
      return { record, usedBytes: recordEndOffset };
    }

    case RecordType.INDEX_DATA:
      throw new Error("Not yet implemented");

    case RecordType.CHUNK_INFO:
      throw new Error("Not yet implemented");
  }
}
