import { defineConfig } from 'vite'
import { resolve } from 'path'
import react from '@vitejs/plugin-react'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    dts({
      include:      ['src'],
      tsconfigPath: './tsconfig.json',
      outDir:       'dist',
      rollupTypes:  true,
    }),
  ],
  build: {
    lib: {
      entry:    resolve(__dirname, 'src/index.ts'),
      name:     'AsteroidBlaster',
      formats:  ['es', 'umd'],
      fileName: (fmt) => fmt === 'umd'
        ? 'asteroid-blaster.umd.cjs'
        : 'asteroid-blaster.es.js',
    },
    rollupOptions: {
      external:       ['react', 'react-dom', 'react/jsx-runtime'],
      output: {
        globals: {
          react:               'React',
          'react-dom':         'ReactDOM',
          'react/jsx-runtime': 'ReactJSXRuntime',
        },
      },
    },
  },
})
