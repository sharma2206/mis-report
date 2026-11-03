import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/main.jsx'],
            refresh: true,
        }),
        tailwindcss(),
        react(),
    ],
    server: {
        // Bind explicitly to 127.0.0.1 so the dev server is reachable as
        // http://localhost:5174 rather than http://[::1]:5174.  Chrome has a
        // known issue where it does not honour IPv6 loopback addresses in CSP
        // source lists, causing @react-refresh and HMR scripts to be blocked
        // even when [::1] is whitelisted.
        host: 'localhost',
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
    build: {
        // Raise warning threshold so ECharts chunk (split below) doesn't trigger it
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    // Core React runtime — cached independently
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],

                    // State management — cached independently
                    'vendor-state': ['@reduxjs/toolkit', 'react-redux', '@tanstack/react-query'],

                    // ECharts — largest dependency (~1 MB); isolated so it is
                    // cached by the browser after the first visit and never
                    // re-downloaded when app code changes.
                    'vendor-echarts': ['echarts', 'echarts-for-react'],

                    // Recharts — separate charts library
                    'vendor-recharts': ['recharts'],

                    // Animation and icon library
                    'vendor-ui': ['framer-motion', 'lucide-react'],

                    // Table, form utilities
                    'vendor-forms': [
                        '@tanstack/react-table',
                        'react-hook-form',
                        '@hookform/resolvers',
                        'zod',
                    ],
                },
            },
        },
    },
});
