import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts'],
    testTimeout: 10_000,
    hookTimeout: 10_000,
    // Ensure all tests run without external services
    env: {
      NODE_ENV: 'test',
    },
  },
});
