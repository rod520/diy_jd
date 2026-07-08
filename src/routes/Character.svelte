<script lang="ts">
	import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
	import { T } from '@threlte/core';
	import { VRMLoaderPlugin } from '@pixiv/three-vrm';
	const loader = new GLTFLoader();
	let gltf = $state<GLTF>()
	loader.register((parser) => {
    	return new VRMLoaderPlugin(parser);
  	});

	let {callback}: {callback: (gltf: GLTF) => void} = $props()
	loader.load('/src/lib/assets/VRM1_Constraint_Twist_Sample.vrm',
		(gltf0) => {
      // retrieve a VRM instance from gltf
      gltf  = gltf0.userData.vrm;

      // deal with vrm features
      console.log(gltf);
	  callback(gltf)
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
