// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { EventArgs, EventNames, ValidEventTypes } from "eventemitter3";

import McapStreamingParser, {
  McapParserEventTypes,
  MCAP_MAGIC,
  RecordType,
} from "./McapStreamingParser";

type EventNameAndArgs<T extends ValidEventTypes, K extends EventNames<T>> = K extends keyof T
  ? [K, ...EventArgs<T, K>]
  : never;

function makeStreamingParser() {
  const emitted: EventNameAndArgs<McapParserEventTypes, keyof McapParserEventTypes>[] = [];
  const parser = new McapStreamingParser();
  parser.on("header", () => emitted.push(["header"]));
  parser.on("error", (err) => emitted.push(["error", err]));
  parser.on("channelInfo", (record) => emitted.push(["channelInfo", record]));
  parser.on("message", (record) => emitted.push(["message", record]));
  parser.on("footer", (record) => emitted.push(["footer", record]));
  parser.on("complete", () => emitted.push(["complete"]));
  return { parser, emitted };
}

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

describe("McapStreamingParser", () => {
  it("parses header", () => {
    // Test incremental feed logic by splitting the magic header bytes into all possible
    // subdivisions. `splits` is a bitmask where a 1 bit indicates the input should be split at that
    // index.
    for (let splits = 0; splits < 2 ** MCAP_MAGIC.length; splits++) {
      const { parser, emitted } = makeStreamingParser();
      let nextSliceStart = 0;
      for (let splitLocation = 0; splitLocation < MCAP_MAGIC.length; splitLocation++) {
        if ((splits & (2 ** splitLocation)) === 0) {
          continue;
        }
        if (splitLocation !== nextSliceStart) {
          parser.feed(new Uint8Array(MCAP_MAGIC.slice(nextSliceStart, splitLocation)));
        }
        nextSliceStart = splitLocation;
      }
      parser.feed(new Uint8Array(MCAP_MAGIC.slice(nextSliceStart)));

      expect(emitted).toEqual([["header"]]);
    }
  });

  it("rejects invalid header", () => {
    for (let i = 0; i < MCAP_MAGIC.length - 1; i++) {
      const { parser, emitted } = makeStreamingParser();
      const badMagic = MCAP_MAGIC.slice();
      badMagic[i] = 0x00;
      parser.feed(new Uint8Array(badMagic));
      expect(emitted).toEqual([
        [
          "error",
          expect.objectContaining({ message: expect.stringMatching("Expected MCAP magic") }),
        ],
      ]);
    }
  });

  it("parses empty file", () => {
    const { parser, emitted } = makeStreamingParser();
    parser.feed(
      new Uint8Array([
        ...MCAP_MAGIC,
        RecordType.FOOTER,
        ...uint64LE(0n), // index pos
        ...uint32LE(0), // index crc
        ...MCAP_MAGIC,
      ]),
    );
    expect(emitted).toEqual([["header"], ["footer", { indexPos: 0n, indexCrc: 0 }], ["complete"]]);
  });

  it("parses file with empty chunk", () => {
    const { parser, emitted } = makeStreamingParser();
    parser.feed(
      new Uint8Array([
        ...MCAP_MAGIC,

        RecordType.CHUNK,
        ...uint32LE(8 + 4 + 4), // record length
        ...uint64LE(0n), // decompressed size
        ...uint32LE(0), // decompressed crc32
        ...string(""), // compression
        // (no chunk data)

        RecordType.FOOTER,
        ...uint64LE(0n), // index pos
        ...uint32LE(0), // index crc
        ...MCAP_MAGIC,
      ]),
    );
    expect(emitted).toEqual([["header"], ["footer", { indexPos: 0n, indexCrc: 0 }], ["complete"]]);
  });

  it("parses channel info", () => {
    const { parser, emitted } = makeStreamingParser();
    parser.feed(
      new Uint8Array([
        ...MCAP_MAGIC,

        RecordType.CHANNEL_INFO,
        ...uint32LE(4 + 4 + "mytopic".length + 4 + "utf12".length + 4 + "none".length + 4 + 3), // record length
        ...uint32LE(1), // channel id
        ...string("mytopic"), // topic
        ...string("utf12"), // serialization format
        ...string("none"), // schema format
        ...uint32LE(0), // empty schema
        ...[1, 2, 3], // channel data

        RecordType.FOOTER,
        ...uint64LE(0n), // index pos
        ...uint32LE(0), // index crc
        ...MCAP_MAGIC,
      ]),
    );
    expect(emitted).toEqual([
      ["header"],
      [
        "channelInfo",
        {
          id: 1,
          topic: "mytopic",
          serializationFormat: "utf12",
          schemaFormat: "none",
          schema: new ArrayBuffer(0),
          data: new Uint8Array([1, 2, 3]).buffer,
        },
      ],
      ["footer", { indexPos: 0n, indexCrc: 0 }],
      ["complete"],
    ]);
  });
});
