// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

declare module 'kalidokit/dist/kalidokit.es.js' {
	export { Face, Hand, Pose, Utils } from 'kalidokit';
}

export {};
