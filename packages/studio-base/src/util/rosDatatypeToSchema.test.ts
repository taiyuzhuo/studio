// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { parse, RosMsgDefinition } from "@foxglove/rosmsg";
import { RosDatatypes } from "@foxglove/studio-base/types/RosDatatypes";
import { rosDatatypeToSchema } from "@foxglove/studio-base/util/rosDatatypeToSchema";

function rosMsgDefinitionsToDatatypes(
  rootName: string,
  definitions: RosMsgDefinition[],
): RosDatatypes {
  const datatypes: RosDatatypes = new Map();

  const definitionZero = definitions[0];
  if (definitionZero) {
    definitionZero.name ??= rootName;
  }

  for (const definition of definitions) {
    const name = definition.name;
    if (!name) {
      continue;
    }
    datatypes.set(name, definition);
  }

  return datatypes;
}

describe("rosDatatypesToSchema", () => {
  it("should schema std_msgs/Header", () => {
    const msg = `
        uint32 seq
        time stamp
        string frame_id
    `;

    const datatypes = rosMsgDefinitionsToDatatypes("std_msgs/Header", parse(msg));
    const schema = rosDatatypeToSchema("std_msgs/Header", datatypes);

    expect(schema).toEqual({
      name: "std_msgs/Header",
      type: "record",
      fields: [
        {
          name: "seq",
          type: "integer",
        },
        {
          name: "stamp",
          type: "record",
          fields: [
            { name: "sec", type: "integer" },
            { name: "nsec", type: "integer" },
          ],
        },
        {
          name: "frame_id",
          type: "string",
        },
      ],
    });
  });
});
