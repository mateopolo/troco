import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    include: [
      'tests/rules/**/*.{test,spec}.{js,ts}',
      'functions/test/**/*.{test,spec}.{js,ts}'
    ]
  }
});

