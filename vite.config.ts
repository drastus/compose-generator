import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath, URL} from 'node:url';

export default defineConfig(({mode}) => ({
	plugins: [react()],
	resolve: {
		alias: {
			'@': fileURLToPath(new URL('./src', import.meta.url)),
		},
	},
	build: mode === 'standalone'
		? {
			outDir: 'dist-standalone',
			emptyOutDir: true,
		}
		: {
			outDir: 'dist',
			emptyOutDir: true,
			lib: {
				entry: fileURLToPath(new URL('./src/main.tsx', import.meta.url)),
				formats: ['es'],
				fileName: () => 'compose-generator.js',
			},
			rollupOptions: {
				external: ['feather-icons'],
				output: {
					assetFileNames: 'compose-generator.[ext]',
					chunkFileNames: 'compose-generator-[name]-[hash].js',
				},
			},
		},
}));
