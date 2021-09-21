// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ByteStorage from "./ByteStorage";
import { MCAP_MAGIC } from "./constants";
import { verifyMagic, parseRecord } from "./parse";
import { McapMagic, McapRecord } from "./types";

export default class McapReader {
  private storage = new ByteStorage(MCAP_MAGIC.length * 2);

  constructor() {}

  append(data: Uint8Array): void {
    this.storage.append(data);
  }

  readMagic(): McapMagic | undefined {
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

  bytesRemaining(): number {
    return this.storage.bytesRemaining();
  }
}
