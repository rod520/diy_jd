<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<script lang="ts">
	import Camera from './Camera.svelte';
	import { Canvas, T } from '@threlte/core';
	import { MathUtils } from 'three';
	import type { VRM } from '@pixiv/three-vrm';
	import Character from './Character.svelte';

	let gltf: VRM | undefined = $state<VRM>();
</script>



<Canvas>
	<T.PerspectiveCamera
		makeDefault
		position={[-0.85, 1.75, 2.46]}
		oncreate={(ref: { lookAt: (arg0: number, arg1: number, arg2: number) => void }) => {
			ref.lookAt(0, 1, 0);
		}}
	/>

	<T.AmbientLight />
	<T.DirectionalLight position={[10, 5, 5]} castShadow />

	<Character callback={(vrm) => (gltf = vrm)} />

	<T.Mesh rotation.x={MathUtils.degToRad(-90)} receiveShadow>
		<T.CircleGeometry args={[3, 72]} />
		<T.MeshStandardMaterial color="white" />
	</T.Mesh>
</Canvas>
{#if gltf}
	<Camera gltf={gltf} />
{/if}
