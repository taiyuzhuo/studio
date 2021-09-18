// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

export type McapMagic = {
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

export type McapRecord = ChannelInfo | Message | Chunk | IndexData | ChunkInfo | Footer;
