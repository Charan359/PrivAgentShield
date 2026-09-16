import { runPhase2Tests } from "./phase2-suite";

runPhase2Tests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Phase 2 test suite failed:", err);
    process.exit(1);
  });
