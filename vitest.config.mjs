import { defineConfig } from 'vitest/config';
import babel from '@babel/core';

export default defineConfig({
  plugins: [
    {
      name: 'babel-jsx-transform',
      transform(code, id) {
        if (id.includes('node_modules')) return null;
        if (id.endsWith('.js') && (id.includes('src/') || id.includes('tests/'))) {
          const transformed = babel.transformSync(code, {
            filename: id,
            presets: ['@babel/preset-react'],
            sourceMaps: true,
          });
          return {
            code: transformed?.code || code,
            map: transformed?.map,
          };
        }
        return null;
      },
    },
  ],
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 20000,
    include: [
      'tests/rules/**/*.{test,spec}.{js,ts}',
      'functions/test/**/*.{test,spec}.{js,ts}',
      'tests/unit/**/*.{test,spec}.{js,ts}'
    ]
  }
});
