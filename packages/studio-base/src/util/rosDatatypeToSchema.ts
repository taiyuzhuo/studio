// This Source Code Form is subject to the terms of the Mozilla Public
// License, v2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/

import { Schema, SchemaType } from "@foxglove/studio";
import { RosDatatypes } from "@foxglove/studio-base/types/RosDatatypes";

// http://wiki.ros.org/msg

// https://www.tutorialspoint.com/avro/avro_schemas.htm

function rosTypeToSchemaType(rosType: string): SchemaType {
  switch (rosType) {
    case "bool":
      return "boolean";
    case "char":
    case "byte":
    case "int8":
    case "uint8":
    case "int16":
    case "uint16":
    case "int32":
    case "uint32":
    case "int64":
    case "uint64":
      return "integer";
    case "float32":
    case "float64":
      return "number";
    case "string":
      return "string";
    case "time":
    case "duration":
      return "record";
  }
  return "record";
}

function rosDatatypeToSchema(datatype: string, datatypes: RosDatatypes): Schema | undefined {
  const rosMsgDef = datatypes.get(datatype);
  if (!rosMsgDef) {
    return undefined;
  }

  const fields: Schema[] = [];
  const schema: Schema = {
    name: datatype,
    type: "record",
    fields,
  };

  for (const definition of rosMsgDef.definitions) {
    // skip constants
    if (definition.isConstant === true) {
      continue;
    }

    const itemType = rosTypeToSchemaType(definition.type);

    const isArray = definition.isArray === true;
    const field: Schema = {
      name: definition.name,
      type: isArray ? "array" : itemType,
    };

    if (isArray) {
      field.items = itemType;
    }

    // For complex types, make a schema to get the fields
    if (definition.isComplex === true) {
      const fieldSchema = rosDatatypeToSchema(definition.type, datatypes);
      if (!fieldSchema) {
        continue;
      }
      field.fields = fieldSchema.fields;
    } else if (definition.type === "time" || definition.type === "duration") {
      // _time_ and _duration_ are builtin record types
      field.fields = [
        { name: "sec", type: "integer" },
        { name: "nsec", type: "integer" },
      ];
    }

    fields.push(field);
  }

  return schema;
}

export { rosDatatypeToSchema };
