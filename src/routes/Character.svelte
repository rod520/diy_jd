<script lang="ts">
	import { GLTF, type ThrelteGltf, useGltfAnimations } from '@threlte/extras';
	import type { Object3D } from 'three';
	type CharacterActions =
		'agree' | 'headShake' | 'idle' | 'run' | 'sad_pose' | 'sneak_pose' | 'walk';

	interface Props {
		actionKey: CharacterActions;
	}

	let { actionKey = 'idle' }: Props = $props();

	let gltf = $state<ThrelteGltf>();

	let { actions } = useGltfAnimations(() => gltf);
    // this is for gltf animations. We dont want that. Need to do some research into rigging?
	let currentActionKey: CharacterActions = 'idle';

	$effect(() => {
		// This effect acts like an init default pose
		$actions.idle?.play();
	});


    // this one transitions when the action key changes, possibly useful for my needs? Comment out later
	$effect(() => {
		transitionTo(actionKey, 0.3);
	});

	function transitionTo(actionKey: CharacterActions, duration = 1) {
		const currentAction = $actions[currentActionKey];
		const nextAction = $actions[actionKey];
		if (!nextAction || currentAction === nextAction) return;
		// Function inspired by: https://github.com/mrdoob/three.js/blob/master/examples/webgl_animation_skinning_blending.html
		nextAction.enabled = true;
		if (currentAction) {
			currentAction.crossFadeTo(nextAction, duration, true);
		}
		// Not sure why I need this but the source code does not
        // LOL ^
		nextAction.play();
		currentActionKey = actionKey;
	}
</script>
<!-- My gltf component: I'll probably stick with this for now if I can-->
<GLTF
	bind:gltf
	url="https://threejs.org/examples/models/gltf/Xbot.glb"
	oncreate={(scene: Object3D) => {
		scene.traverse((child) => {
			child.castShadow = true;
		});
	}}
/>
