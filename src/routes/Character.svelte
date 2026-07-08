<script lang="ts">
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { T } from '@threlte/core';
	import { VRMLoaderPlugin, type VRM } from '@pixiv/three-vrm';
	const loader = new GLTFLoader();
	let gltf = $state<GLTF>()
	loader.register((parser) => {
    	return new VRMLoaderPlugin(parser);
  	});

	let {callback}: {callback: (vrm: VRM) => void} = $props()
	loader.load('/src/lib/assets/VRM1_Constraint_Twist_Sample.vrm',
		(gltf0) => {
      // retrieve a VRM instance from gltf
	  const vrm = gltf0.userData.vrm as VRM;
	  // now you can use the vrm instance to access humanoid bones, blend shapes, etc.
	  console.log('VRM model loaded:', vrm);
	  gltf = gltf0;
	  callback(vrm)
    },

    // called while loading is progressing
    (progress) => console.log('Loading model...', 100.0 * (progress.loaded / progress.total), '%'),

    // called when loading has errors
    (error) => console.error(error),
	)
</script>

<!-- My gltf component: I'll probably stick with this for now if I can-->

{#if gltf}
	<T is={gltf.scene} />
{/if}
