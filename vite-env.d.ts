/// <reference types="vite/client" />

declare global {
	interface ImportMetaEnv {
		readonly DEV: boolean
		readonly PROD: boolean
		readonly MODE: string
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv
	}
}

export {}
