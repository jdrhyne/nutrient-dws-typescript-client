import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  outDir: 'dist',
  outExtension({ format }) {
    return {
      js: `.${format === 'esm' ? 'js' : 'cjs'}`,
    };
  },
  target: 'es2020',
  platform: 'node',
  skipNodeModulesBundle: true,
  treeshake: true,
});