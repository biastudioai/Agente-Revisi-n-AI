export const Type = {
  STRING: "STRING" as const,
  NUMBER: "NUMBER" as const,
  INTEGER: "INTEGER" as const,
  BOOLEAN: "BOOLEAN" as const,
  ARRAY: "ARRAY" as const,
  OBJECT: "OBJECT" as const,
};

export type SchemaType = typeof Type[keyof typeof Type];
