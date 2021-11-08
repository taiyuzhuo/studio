// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  IDataSourceFactory,
  DataSourceFactoryInitializeArgs,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import {
  buildNonRos1PlayerFromDescriptor,
  buildPlayerFromFiles,
} from "@foxglove/studio-base/players/buildPlayer";
import { Player } from "@foxglove/studio-base/players/types";
import {
  getLocalRosbag2Descriptor,
  getLocalUlogDescriptor,
} from "@foxglove/studio-base/randomAccessDataProviders/standardDataProviderDescriptors";

enum FileType {
  Ros1Bag,
  Ros2Bag,
  Ulog,
}

class OpenFileDataSourceFactory implements IDataSourceFactory {
  id = "open-local-file";
  displayName = "Open file";
  iconName: IDataSourceFactory["iconName"] = "OpenFile";
  supportedFileTypes = [".bag", ".db3", ".ulg", ".ulog"];

  initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const file = args.file;
    if (!file) {
      return;
    }

    switch (getFileType(file)) {
      case FileType.Ros1Bag:
        return buildPlayerFromFiles([file], {
          unlimitedMemoryCache: args.unlimitedMemoryCache,
          metricsCollector: args.metricsCollector,
        });
      case FileType.Ros2Bag:
        return buildNonRos1PlayerFromDescriptor(getLocalRosbag2Descriptor(file), {
          metricsCollector: args.metricsCollector,
          unlimitedMemoryCache: args.unlimitedMemoryCache,
        });
      case FileType.Ulog:
        return buildNonRos1PlayerFromDescriptor(getLocalUlogDescriptor(file), {
          metricsCollector: args.metricsCollector,
          unlimitedMemoryCache: args.unlimitedMemoryCache,
        });
    }
  }
}

function getFileType(file: File): FileType {
  const extension = file.name.split(".").pop() ?? ".bag";

  switch (extension) {
    case "bag":
      return FileType.Ros1Bag;
    case "db3":
      return FileType.Ros2Bag;
    case "ulg":
    case "ulog":
      return FileType.Ulog;
    default:
      // This could read the first few bytes of the file to try and determine the type
      return FileType.Ros1Bag;
  }
}

export default OpenFileDataSourceFactory;
