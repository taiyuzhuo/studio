// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import McapReader from "./McapReader";
import { MCAP_MAGIC, RecordType } from "./constants";

function uint32LE(n: number): Uint8Array {
  const result = new Uint8Array(4);
  new DataView(result.buffer).setUint32(0, n, true);
  return result;
}
function uint64LE(n: bigint): Uint8Array {
  const result = new Uint8Array(8);
  new DataView(result.buffer).setBigUint64(0, n, true);
  return result;
}
function string(str: string): Uint8Array {
  const encoded = new TextEncoder().encode(str);
  const result = new Uint8Array(4 + encoded.length);
  new DataView(result.buffer).setUint32(0, encoded.length, true);
  result.set(encoded, 4);
  return result;
}
function record(type: RecordType, data: number[]): Uint8Array {
  const result = new Uint8Array(5 + data.length);
  result[0] = type;
  new DataView(result.buffer).setUint32(1, data.length, true);
  result.set(data, 5);
  return result;
}

describe("McapReader", () => {
  it("parses header", () => {
    // Test incremental feed logic by splitting the magic header bytes into all possible
    // subdivisions. `splits` is a bitmask where a 1 bit indicates the input should be split at that
    // index.
    for (let splits = 0; splits < 2 ** MCAP_MAGIC.length; splits++) {
      const reader = new McapReader();
      let nextSliceStart = 0;
      for (let splitLocation = 0; splitLocation < MCAP_MAGIC.length; splitLocation++) {
        if ((splits & (2 ** splitLocation)) === 0) {
          continue;
        }
        if (splitLocation !== nextSliceStart) {
          reader.append(new Uint8Array(MCAP_MAGIC.slice(nextSliceStart, splitLocation)));
          if (splitLocation < MCAP_MAGIC.length) {
            // eslint-disable-next-line jest/no-conditional-expect
            expect(reader.readHeader()).toBeUndefined();
          }
        }
        nextSliceStart = splitLocation;
      }
      reader.append(new Uint8Array(MCAP_MAGIC.slice(nextSliceStart)));
      expect(reader.readHeader()).toEqual({ type: "Header" });
    }
  });

  it("rejects invalid header", () => {
    for (let i = 0; i < MCAP_MAGIC.length - 1; i++) {
      const reader = new McapReader();
      const badMagic = MCAP_MAGIC.slice();
      badMagic[i] = 0x00;
      reader.append(new Uint8Array(badMagic));
      expect(() => reader.readHeader()).toThrow("Expected MCAP magic");
    }
  });

  it("parses empty file", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,
        RecordType.FOOTER,
        ...uint64LE(0x0123456789abcdefn), // index pos
        ...uint32LE(0x01234567), // index crc
        ...MCAP_MAGIC,
      ]),
    );
    expect(reader.readHeader()).toEqual({ type: "Header" });
    expect(reader.readRecord()).toEqual({
      type: "Footer",
      indexPos: 0x0123456789abcdefn,
      indexCrc: 0x01234567,
    });
  });

  it("parses file with empty chunk", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,

        ...record(RecordType.CHUNK, [
          ...uint64LE(0n), // decompressed size
          ...uint32LE(0), // decompressed crc32
          ...string(""), // compression
          // (no chunk data)
        ]),

        RecordType.FOOTER,
        ...uint64LE(0n), // index pos
        ...uint32LE(0), // index crc
        ...MCAP_MAGIC,
      ]),
    );
    expect(reader.readHeader()).toEqual({ type: "Header" });
    expect(reader.readRecord()).toEqual({ type: "Chunk" });
    expect(reader.readRecord()).toEqual({ type: "Footer", indexPos: 0n, indexCrc: 0 });
  });

  it("parses channel info at top level", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,

        ...record(RecordType.CHANNEL_INFO, [
          ...uint32LE(1), // channel id
          ...string("mytopic"), // topic
          ...string("utf12"), // serialization format
          ...string("none"), // schema format
          ...uint32LE(0), // empty schema
          ...[1, 2, 3], // channel data
        ]),

        RecordType.FOOTER,
        ...uint64LE(0n), // index pos
        ...uint32LE(0), // index crc
        ...MCAP_MAGIC,
      ]),
    );
    expect(reader.readHeader()).toEqual({ type: "Header" });
    expect(reader.readRecord()).toEqual({
      type: "ChannelInfo",
      id: 1,
      topic: "mytopic",
      serializationFormat: "utf12",
      schemaFormat: "none",
      schema: new ArrayBuffer(0),
      data: new Uint8Array([1, 2, 3]).buffer,
    });
    expect(reader.readRecord()).toEqual({ type: "Footer", indexPos: 0n, indexCrc: 0 });
  });

  it("parses channel info in chunk", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,

        ...record(RecordType.CHUNK, [
          ...uint64LE(0n), // decompressed size
          ...uint32LE(0), // decompressed crc32
          ...string(""), // compression

          ...record(RecordType.CHANNEL_INFO, [
            ...uint32LE(1), // channel id
            ...string("mytopic"), // topic
            ...string("utf12"), // serialization format
            ...string("none"), // schema format
            ...uint32LE(0), // empty schema
            ...[1, 2, 3], // channel data
          ]),
        ]),

        RecordType.FOOTER,
        ...uint64LE(0n), // index pos
        ...uint32LE(0), // index crc
        ...MCAP_MAGIC,
      ]),
    );
    expect(reader.readHeader()).toEqual({ type: "Header" });
    expect(reader.readRecord()).toEqual({
      type: "ChannelInfo",
      id: 1,
      topic: "mytopic",
      serializationFormat: "utf12",
      schemaFormat: "none",
      schema: new ArrayBuffer(0),
      data: new Uint8Array([1, 2, 3]).buffer,
    });
    expect(reader.readRecord()).toEqual({ type: "Footer", indexPos: 0n, indexCrc: 0 });
  });
});
