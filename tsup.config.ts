import { defineConfig } from 'tsup'
import { dependencies } from './package.json'

export default defineConfig({
  clean: true,
  entry: ['src/index.ts', 'src/server.ts'],
  target: 'esnext',
  format: ['esm', 'cjs'],
  external: Object.keys(dependencies),
  dts: true,
})
