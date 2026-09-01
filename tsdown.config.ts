import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', 'src/cli.ts'],
  platform: 'node',
  fixedExtension: false,
  dts: true,
  publint: true,
  attw: {
    profile: 'esm-only',
  },
});
