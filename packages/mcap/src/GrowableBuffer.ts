// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export default class GrowableBuffer {
  private buffer: Uint8Array;
  private count = 0;

  constructor(capacity: number) {
    this.buffer = new Uint8Array(capacity);
  }

  // eslint-disable-next-line no-restricted-syntax
  get length(): number {
    return this.count;
  }

  get(index: number): number {
    if (index >= this.count) {
      throw new Error(
        `Index ${index} beyond GrowableBuffer bounds (${this.count}, capacity ${this.buffer.length})`,
      );
    }
    return this.buffer[index]!;
  }

  slice(start: number, end: number): Uint8Array {
    return this.buffer.slice(start, Math.max(end, this.count));
  }

  append(data: Uint8Array): void {
    this.growToFit(this.count + data.length);
    this.buffer.set(data, this.count);
    this.count += data.length;
  }

  clear(): void {
    this.count = 0;
    this.buffer.fill(0);
  }

  growToFit(capacity: number): void {
    if (capacity > this.buffer.length) {
      const newBuffer = new Uint8Array(capacity); // FIXME: more intelligent growth
      newBuffer.set(this.buffer);
      this.buffer = newBuffer;
    }
  }
}
