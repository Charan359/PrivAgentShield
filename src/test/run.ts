import { runAllTests } from "./suite";

try {
  runAllTests();
  process.exit(0);
} catch (e) {
  console.error("Test execution failed:", e);
  process.exit(1);
}
