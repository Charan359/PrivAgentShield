// experiments/store.ts
/**
 * Simple filesystem store helper for experiment results.
 * Ensures each run gets a unique directory and provides a method
 * to write arbitrary JSON objects.
 */
import fs from "fs";
import path from "path";

export async function storeResult(baseDir: string, data: any) {
  const storePath = path.join(baseDir, "store.json");
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(storePath, JSON.stringify(data, null, 2), (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}
