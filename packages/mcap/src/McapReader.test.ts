// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import fs from "fs";
import decompressLZ4 from "wasm-lz4";

import { Chunk, McapRecord } from ".";
import McapReader from "./McapReader";
import { MCAP_MAGIC, RecordType } from "./constants";
import { parseRecord } from "./parse";

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
// eslint-disable-next-line no-underscore-dangle
function record_(type: RecordType, data: number[]): Uint8Array {
  if (type === RecordType.FOOTER) {
    const result = new Uint8Array(1 + data.length);
    result[0] = type;
    result.set(data, 1);
    return result;
  }
  const result = new Uint8Array(5 + data.length);
  result[0] = type;
  new DataView(result.buffer).setUint32(1, data.length, true);
  result.set(data, 5);
  return result;
}

const formatVersion = 1;

jest.setTimeout(300000);
describe("McapReader", () => {
  it.skip("parses demo.mcap", async () => {
    await decompressLZ4.isLoaded;
    const reader = new McapReader();
    const stream = fs.createReadStream("/Users/Work/Downloads/demo.mcap");

    let readHeader = false;
    let readFooter = false;
    const records: McapRecord[] = [];
    await new Promise<void>((resolve, reject) => {
      function parseChunk(chunk: Chunk) {
        let buffer = new Uint8Array(chunk.data);
        if (chunk.compression === "lz4") {
          buffer = decompressLZ4(buffer, Number(chunk.decompressedSize));
          //FIXME: check crc32
        }
        let offset = 0;
        const view = new DataView(buffer.buffer);
        for (let record, usedBytes; ({ record, usedBytes } = parseRecord(view, offset)), record; ) {
          records.push(record);
          offset += usedBytes;
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
          reader.append(data);
          if (!readHeader) {
            const magic = reader.readMagic();
            if (magic) {
              // eslint-disable-next-line jest/no-conditional-expect
              expect(magic).toEqual({ type: "Magic", formatVersion: 1 });
              readHeader = true;
            }
          }
          for (let record; (record = reader.readRecord()); ) {
            if (record.type === "Chunk") {
              parseChunk(record);
            } else {
              records.push(record);
            }
            if (record.type === "Footer") {
              const magic = reader.readMagic();
              // eslint-disable-next-line jest/no-conditional-expect
              expect(magic).toEqual({ type: "Magic", formatVersion: 1 });
              readFooter = true;
              break;
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

    expect(records.length).toBe(5425);
  });

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
            expect(reader.readMagic()).toBeUndefined();
          }
        }
        nextSliceStart = splitLocation;
      }
      reader.append(new Uint8Array(MCAP_MAGIC.slice(nextSliceStart)));
      reader.append(new Uint8Array([formatVersion]));
      expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    }
  });

  it("rejects unknown format version", () => {
    const reader = new McapReader();
    reader.append(new Uint8Array([...MCAP_MAGIC, 2]));
    expect(() => reader.readMagic()).toThrow("Unsupported format version 2");
  });

  it("rejects invalid header", () => {
    for (let i = 0; i < MCAP_MAGIC.length - 1; i++) {
      const reader = new McapReader();
      const badMagic = MCAP_MAGIC.slice();
      badMagic[i] = 0x00;
      reader.append(new Uint8Array([...badMagic, formatVersion]));
      expect(() => reader.readMagic()).toThrow("Expected MCAP magic");
    }
  });

  it("rejects invalid footer magic", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,
        formatVersion,
        ...record_(RecordType.FOOTER, [
          ...uint64LE(0x0123456789abcdefn), // index pos
          ...uint32LE(0x01234567), // index crc
        ]),
        ...MCAP_MAGIC.slice(0, MCAP_MAGIC.length - 1),
        0x00,
        formatVersion,
      ]),
    );
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    expect(reader.readRecord()).toEqual({
      type: "Footer",
      indexPos: 0x0123456789abcdefn,
      indexCrc: 0x01234567,
    });
    expect(() => reader.readMagic()).toThrow("Expected MCAP magic");
  });

  it("parses empty file", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,
        formatVersion,
        ...record_(RecordType.FOOTER, [
          ...uint64LE(0x0123456789abcdefn), // index pos
          ...uint32LE(0x01234567), // index crc
        ]),
        ...MCAP_MAGIC,
        formatVersion,
      ]),
    );
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    expect(reader.readRecord()).toEqual({
      type: "Footer",
      indexPos: 0x0123456789abcdefn,
      indexCrc: 0x01234567,
    });
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    expect(reader.atEnd()).toBe(true);
  });

  it("parses file with empty chunk", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,
        formatVersion,

        ...record_(RecordType.CHUNK, [
          ...uint64LE(0n), // decompressed size
          ...uint32LE(0), // decompressed crc32
          ...string(""), // compression
          // (no chunk data)
        ]),

        ...record_(RecordType.FOOTER, [
          ...uint64LE(0n), // index pos
          ...uint32LE(0), // index crc
        ]),
        ...MCAP_MAGIC,
        formatVersion,
      ]),
    );
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    expect(reader.readRecord()).toEqual({
      type: "Chunk",
      compression: "",
      decompressedSize: 0n,
      decompressedCrc: 0,
      data: new ArrayBuffer(0),
    });
    expect(reader.readRecord()).toEqual({ type: "Footer", indexPos: 0n, indexCrc: 0 });
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    expect(reader.atEnd()).toBe(true);
  });

  it("parses channel info at top level", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,
        formatVersion,

        ...record_(RecordType.CHANNEL_INFO, [
          ...uint32LE(1), // channel id
          ...string("mytopic"), // topic
          ...string("utf12"), // serialization format
          ...string("none"), // schema format
          ...uint32LE(0), // empty schema
          ...[1, 2, 3], // channel data
        ]),

        ...record_(RecordType.FOOTER, [
          ...uint64LE(0n), // index pos
          ...uint32LE(0), // index crc
        ]),
        ...MCAP_MAGIC,
        formatVersion,
      ]),
    );
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
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
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    expect(reader.atEnd()).toBe(true);
  });

  it("parses channel info in chunk", () => {
    const reader = new McapReader();
    reader.append(
      new Uint8Array([
        ...MCAP_MAGIC,
        formatVersion,

        ...record_(RecordType.CHUNK, [
          ...uint64LE(0n), // decompressed size
          ...uint32LE(0), // decompressed crc32
          ...string(""), // compression

          ...record_(RecordType.CHANNEL_INFO, [
            ...uint32LE(1), // channel id
            ...string("mytopic"), // topic
            ...string("utf12"), // serialization format
            ...string("none"), // schema format
            ...uint32LE(0), // empty schema
            ...[1, 2, 3], // channel data
          ]),
        ]),

        ...record_(RecordType.FOOTER, [
          ...uint64LE(0n), // index pos
          ...uint32LE(0), // index crc
        ]),
        ...MCAP_MAGIC,
        formatVersion,
      ]),
    );
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    const chunk = reader.readRecord();
    if (!chunk || chunk.type !== "Chunk") {
      throw new Error("Expected chunk");
    }
    let offsetInChunk = 0;
    const view = new DataView(chunk.data);
    while (offsetInChunk < view.byteLength) {
      const { record: chanInfo, usedBytes } = parseRecord(view, offsetInChunk);
      expect(chanInfo).toEqual({
        type: "ChannelInfo",
        id: 1,
        topic: "mytopic",
        serializationFormat: "utf12",
        schemaFormat: "none",
        schema: new ArrayBuffer(0),
        data: new Uint8Array([1, 2, 3]).buffer,
      });
      offsetInChunk += usedBytes;
    }
    expect(reader.readRecord()).toEqual({ type: "Footer", indexPos: 0n, indexCrc: 0 });
    expect(reader.readMagic()).toEqual({ type: "Magic", formatVersion });
    expect(reader.atEnd()).toBe(true);
  });
});
