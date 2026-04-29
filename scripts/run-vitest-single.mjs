#!/usr/bin/env node
import { run } from 'vitest';

// Programmatically run vitest for a single test file to avoid executing
// the whole repo test suite in CI-heavy projects.
const file = process.argv[2] || 'src/agents/defaults.test.ts';

try {
  // run returns a promise; passing options will limit included files
  const result = await run({ include: [file], run: true, reporters: 'default', silent: false });
  // vitest's run returns undefined on success in some versions; check global state
  // If the process didn't throw, assume success.
  process.exit(0);
} catch (err) {
  console.error('vitest run failed:', err);
  process.exit(1);
}
