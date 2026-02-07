import { AXA_CONFIG } from './providers/axa.config';
import { GNP_CONFIG } from './providers/gnp.config';
import { METLIFE_CONFIG } from './providers/metlife.config';

function validateSchema(schema: any, path: string = '', issues: string[] = []): string[] {
  if (!schema || typeof schema !== 'object') {
    issues.push(`${path}: schema is not an object`);
    return issues;
  }
  if (!schema.type) {
    issues.push(`${path}: missing 'type' field`);
    return issues;
  }
  if (schema.type === 'OBJECT') {
    if (!schema.properties || typeof schema.properties !== 'object') {
      issues.push(`${path}: OBJECT type missing 'properties'`);
    } else {
      for (const [key, value] of Object.entries(schema.properties)) {
        validateSchema(value, path ? `${path}.${key}` : key, issues);
      }
    }
    if (schema.required) {
      for (const req of schema.required) {
        if (!schema.properties || !schema.properties[req]) {
          issues.push(`${path}: required field '${req}' not found in properties`);
        }
      }
    }
  }
  if (schema.type === 'ARRAY') {
    if (!schema.items) {
      issues.push(`${path}: ARRAY type missing 'items'`);
    } else {
      validateSchema(schema.items, `${path}[]`, issues);
    }
  }
  const supportedFields = ['type', 'description', 'properties', 'items', 'required', 'enum', 'nullable', 'format'];
  for (const key of Object.keys(schema)) {
    if (!supportedFields.includes(key)) {
      issues.push(`${path}: unsupported field '${key}'`);
    }
  }
  return issues;
}

function countProperties(schema: any): number {
  let count = 0;
  if (schema.type === 'OBJECT' && schema.properties) {
    for (const value of Object.values(schema.properties) as any) {
      count++;
      count += countProperties(value);
    }
  }
  if (schema.type === 'ARRAY' && schema.items) {
    count += countProperties(schema.items);
  }
  return count;
}

function getMaxDepth(schema: any, depth: number = 0): number {
  let maxDepth = depth;
  if (schema.type === 'OBJECT' && schema.properties) {
    for (const value of Object.values(schema.properties) as any) {
      maxDepth = Math.max(maxDepth, getMaxDepth(value, depth + 1));
    }
  }
  if (schema.type === 'ARRAY' && schema.items) {
    maxDepth = Math.max(maxDepth, getMaxDepth(schema.items, depth + 1));
  }
  return maxDepth;
}

console.log("=== AXA SCHEMA VALIDATION ===");
const axaIssues = validateSchema(AXA_CONFIG.geminiSchema);
console.log(`Issues: ${axaIssues.length}`);
axaIssues.forEach(i => console.log(`  ❌ ${i}`));
console.log(`Properties: ${countProperties(AXA_CONFIG.geminiSchema)}`);
console.log(`Max depth: ${getMaxDepth(AXA_CONFIG.geminiSchema)}`);
console.log(`JSON size: ${JSON.stringify(AXA_CONFIG.geminiSchema).length} bytes`);

console.log("\n=== GNP SCHEMA VALIDATION ===");
const gnpIssues = validateSchema(GNP_CONFIG.geminiSchema);
console.log(`Issues: ${gnpIssues.length}`);
gnpIssues.forEach(i => console.log(`  ❌ ${i}`));
console.log(`Properties: ${countProperties(GNP_CONFIG.geminiSchema)}`);
console.log(`Max depth: ${getMaxDepth(GNP_CONFIG.geminiSchema)}`);
console.log(`JSON size: ${JSON.stringify(GNP_CONFIG.geminiSchema).length} bytes`);

console.log("\n=== METLIFE SCHEMA VALIDATION ===");
const metlifeIssues = validateSchema(METLIFE_CONFIG.geminiSchema);
console.log(`Issues: ${metlifeIssues.length}`);
metlifeIssues.forEach(i => console.log(`  ❌ ${i}`));
console.log(`Properties: ${countProperties(METLIFE_CONFIG.geminiSchema)}`);
console.log(`Max depth: ${getMaxDepth(METLIFE_CONFIG.geminiSchema)}`);
console.log(`JSON size: ${JSON.stringify(METLIFE_CONFIG.geminiSchema).length} bytes`);

console.log("\n=== REQUIRED FIELDS ===");
console.log("AXA extracted.required:", AXA_CONFIG.geminiSchema.properties.extracted.required);
console.log("GNP extracted.required:", GNP_CONFIG.geminiSchema.properties.extracted.required);
console.log("MetLife extracted.required:", METLIFE_CONFIG.geminiSchema.properties.extracted.required);

process.exit(0);
