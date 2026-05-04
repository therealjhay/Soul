import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': '/src',
        },
    },
    define: {
        global: 'globalThis',
    },
    optimizeDeps: {
        include: ['react', 'react-dom', 'react-router-dom'],
        exclude: [],
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['react', 'react-dom', 'react-router-dom'],
                    motion: ['framer-motion'],
                },
            },
        },
    },
});
