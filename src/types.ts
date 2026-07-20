/** a primitive value representable in JSON */
export type JsonPrimitive = string | number | boolean | null;

/** an array of JSON values */
export type JsonArray = JsonValue[];

/** a plain object of JSON values */
export type JsonObject = { [key: string]: JsonValue | undefined };

/** any value representable in JSON */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
