// experiments/entry-point.ts
/**
 * Phase 4 experiment entry point.
 * Validates environment variables, loads a configuration file, runs the experiment
 * pipeline and stores raw results under `experiments/results/raw/<run-id>/`.
 */
import path from "path";
import fs from "fs";
import { runExperiment } from "./runner";

function loadConfig(configPath: string) {
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }
  const ext = path.extname(configPath).toLowerCase();
  if (ext === ".json") {
    return JSON.parse(fs.readFileSync(configPath, "utf-8"));
  }
  // simple YAML support via js-yaml if present – fallback to JSON otherwise.
  try {
    const yaml = require("js-yaml");
    return yaml.load(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    console.error("Failed to parse config (unsupported format).", e);
    process.exit(1);
  }
}

function getRunId() {
  const now = new Date();
  return `run_${now.toISOString().replace(/[:.]/g, "_")}`;
}

async function main() {
  const args = process.argv.slice(2);
  const configIdx = args.indexOf("--config");
  if (configIdx === -1 || configIdx === args.length - 1) {
    console.error("Usage: node entry-point.js --config <path-to-config.yaml|json>");
    process.exit(1);
  }
  const configPath = args[configIdx + 1];
  const config = loadConfig(configPath);
  const runId = getRunId();
  const outputDir = path.resolve("./experiments/results/raw", runId);
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Running experiment ${config.experiment_id || "unnamed"} → ${runId}`);
  const result = await runExperiment(config, outputDir);
  const outPath = path.join(outputDir, "result.json");
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
  console.log(`Result written to ${outPath}`);
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
