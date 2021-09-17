// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { EventArgs, EventNames, ValidEventTypes } from "eventemitter3";

import McapStreamingParser, { McapParserEventTypes, MCAP_MAGIC } from "./McapStreamingParser";

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

describe("McapStreamingParser", () => {
  it("parses header", () => {
    // Try reading all possible subdivisions of the magic header bytes. `splits` is a bitmask where
    // a 1 bit indicates the input should be split at that index.
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
});
