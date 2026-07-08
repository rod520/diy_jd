<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>
<script lang="ts">
import * as THREE from 'three';
	import Camera from './Camera.svelte';
	import { Canvas, T } from '@threlte/core';
	import { MathUtils } from 'three';
	import type { VRM, VRMHumanBoneName } from '@pixiv/three-vrm';
	import Character from './Character.svelte';
	import type { XYZ } from '$lib/shims/kalidokit';
	import type Euler from 'kalidokit/dist/utils/euler';

	let gltf: VRM | undefined = $state<VRM>();
	const rigRotation = (
		name: VRMHumanBoneName,
		rotation: XYZ | Euler,
		dampener = 1,
		lerpAmount = 0.3
	) => {
		// why is all of these NaN?
		console.log('start rigging with' ,rotation)
		if (!gltf) return;
		const part = gltf.humanoid.getNormalizedBoneNode(name);
		if (!part) return;

		const euler = new THREE.Euler(
			rotation.x * dampener,
			rotation.y * dampener,
			rotation.z * dampener,
			(rotation as { rotationOrder?: THREE.EulerOrder }).rotationOrder || 'XYZ'
		);
		const quaternion = new THREE.Quaternion().setFromEuler(euler);
		part.quaternion.slerp(quaternion, lerpAmount);
		console.log(`Rotated ${name} to`, quaternion);
	};
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

	<Character callback={(vrm) => { 
		gltf = vrm; 
		console.log(gltf)}} 
		/>

	<T.Mesh rotation.x={MathUtils.degToRad(-90)} receiveShadow>
		<T.CircleGeometry args={[3, 72]} />
		<T.MeshStandardMaterial color="white" />
	</T.Mesh>
</Canvas>
{#if gltf}
	<Camera rigRotation={rigRotation} />
{/if}
