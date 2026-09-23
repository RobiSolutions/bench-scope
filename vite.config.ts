import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the same build works at the site root locally
  // and under /bench-scope/ on GitHub Pages without naming the repository.
  base: './',
});
