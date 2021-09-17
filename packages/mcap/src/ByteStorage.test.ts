// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import ByteStorage from "./ByteStorage";

function toArray(view: DataView) {
  return new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
}

describe("ByteStorage", () => {
  it("handles basic append and consume", () => {
    const storage = new ByteStorage();
    expect(storage.hasBytes(0)).toBe(true);
    expect(storage.hasBytes(1)).toBe(false);

    storage.append(new Uint8Array([1, 2, 3]));
    expect(storage.hasBytes(3)).toBe(true);
    expect(storage.hasBytes(4)).toBe(false);
    expect(() => storage.consume(4)).toThrow();

    expect(toArray(storage.view)).toEqual(new Uint8Array([1, 2, 3]));
    storage.consume(3);
    expect(storage.hasBytes(0)).toBe(true);
    expect(storage.hasBytes(1)).toBe(false);
  });

  it("handles partial consume", () => {
    const storage = new ByteStorage();

    storage.append(new Uint8Array([1, 2, 3, 4, 5]));
    expect(storage.hasBytes(5)).toBe(true);
    storage.consume(2);
    expect(storage.hasBytes(3)).toBe(true);
    expect(storage.hasBytes(4)).toBe(false);

    expect(toArray(storage.view)).toEqual(new Uint8Array([3, 4, 5]));
    storage.consume(3);
    expect(storage.hasBytes(0)).toBe(true);
    expect(storage.hasBytes(1)).toBe(false);
  });

  it("reuses buffer within allocated capacity", () => {
    const storage = new ByteStorage(5);
    const buffer = storage.view.buffer;
    storage.append(new Uint8Array([1, 2]));
    expect(storage.view.buffer).toBe(buffer);
    storage.append(new Uint8Array([3, 4, 5]));
    expect(storage.view.buffer).toBe(buffer);
    storage.append(new Uint8Array([6, 7]));
    expect(storage.view.buffer).not.toBe(buffer);
    expect(toArray(storage.view)).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7]));
  });
});
