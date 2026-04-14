import rough from "roughjs";

let generatorInstance: ReturnType<typeof rough.generator> | null = null;

export function getRoughGenerator() {
  if (!generatorInstance) {
    generatorInstance = rough.generator();
  }
  return generatorInstance;
}
