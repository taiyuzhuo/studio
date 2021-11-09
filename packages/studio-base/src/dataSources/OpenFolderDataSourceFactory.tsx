// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import {
  IDataSourceFactory,
  DataSourceFactoryInitializeArgs,
} from "@foxglove/studio-base/context/PlayerSelectionContext";
import { buildNonRos1PlayerFromDescriptor } from "@foxglove/studio-base/players/buildPlayer";
import { Player } from "@foxglove/studio-base/players/types";
import { getLocalRosbag2FolderDescriptor } from "@foxglove/studio-base/randomAccessDataProviders/standardDataProviderDescriptors";

class OpenFolderDataSourceFactory implements IDataSourceFactory {
  id = "open-local-folder";
  displayName = "Open folder (ROS 2 bag)";
  iconName: IDataSourceFactory["iconName"] = "OpenFolder";
  supportsOpenDirectory = true;

  initialize(args: DataSourceFactoryInitializeArgs): Player | undefined {
    const folder = args.folder;
    if (!folder) {
      return;
    }

    return buildNonRos1PlayerFromDescriptor(getLocalRosbag2FolderDescriptor(folder), {
      metricsCollector: args.metricsCollector,
      unlimitedMemoryCache: args.unlimitedMemoryCache,
    });
  }
}

export default OpenFolderDataSourceFactory;
