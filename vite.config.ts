import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath, URL} from 'node:url';

export default defineConfig(({mode}) => ({
	plugins: [react()],
	define: {
		'process.env.NODE_ENV': JSON.stringify(mode === 'development' ? 'development' : 'production'),
		EMBEDDED: JSON.stringify(mode !== 'standalone'),
	},
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
				output: {
					assetFileNames: 'compose-generator.[ext]',
					chunkFileNames: 'compose-generator-[name]-[hash].js',
				},
			},
		},
}));
