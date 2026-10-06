/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // relative paths so the build works under /<repo>/ on GitHub Pages
  base: './',
  test: {
    include: ['src/**/*.test.ts'],
  },
})
