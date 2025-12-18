import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
	root: ".",
	server: {
		open: true,
		port: 3000,
	},
	build: {
		outDir: "dist-demo",
	},
	resolve: {
		alias: {
			"@xumi/chunk-upload-lib": resolve(__dirname, "./src"),
		},
	},
});
