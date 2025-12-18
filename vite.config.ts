import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
	root: "./demo",
	server: {
		open: true,
	},
	build: {
		outDir: "../dist-demo",
	},
	resolve: {
		alias: {
			"@xumi/chunk-upload": resolve(__dirname, "./src"),
		},
	},
	publicDir: "../",
});
