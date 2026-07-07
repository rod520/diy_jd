<script lang="ts">
	import * as Kalidokit from 'kalidokit/dist/kalidokit.es.js';
	import type { Holistic as THolistic} from '@mediapipe/holistic';
	import type { Camera as TCamera } from '@mediapipe/camera_utils';
	import { onMount } from 'svelte';
	let viewSelfEl: HTMLVideoElement;
	onMount(() => {
		void (async () => {
			await import('@mediapipe/holistic/holistic.js');
			await import('@mediapipe/camera_utils/camera_utils.js');

			if (cancelled) return;
			const Holistic = (window as any).Holistic;
			const Camera = (window as any).Camera;

			const holistic:THolistic = new Holistic({
				locateFile: (file: string) => {
					return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic@0.4.1633559476/${file}`;
				}
			});

			holistic.onResults((results) => {
				// do something with prediction results
				// landmark names may change depending on TFJS/Mediapipe model version
				let facelm = results.faceLandmarks;
				let poselm = results.poseLandmarks;

				let rightHandlm = results.rightHandLandmarks;
				let leftHandlm = results.leftHandLandmarks;

				let faceRig = Kalidokit.Face.solve(facelm, { runtime: 'mediapipe', video: viewSelfEl });
				let poseRig = Kalidokit.Pose.solve(poselm, poselm, {
					runtime: 'mediapipe',
					video: viewSelfEl
				});
				let rightHandRig = Kalidokit.Hand.solve(rightHandlm, 'Right');
				let leftHandRig = Kalidokit.Hand.solve(leftHandlm, 'Left');
				console.log(faceRig, poseRig, rightHandRig, leftHandRig);
			});

			// use Mediapipe's webcam utils to send video to holistic every frame
			let camera: TCamera = new Camera(viewSelfEl, {
				onFrame: async () => {
					await holistic.send({ image: viewSelfEl });
				},
				width: 640,
				height: 480
			});
			camera.start();
		});
	});

	function handleCamera() {
		navigator.mediaDevices
			.getUserMedia({ video: true, audio: false })
			.then((stream) => {
				viewSelfEl.srcObject = stream;
				viewSelfEl.play();
			})
			.catch((err) => {
				console.error(`An error occurred: ${err}`);
			});
	}
</script>

<video bind:this={viewSelfEl}>Video stream not available.</video>
<button onclick={handleCamera}>Start Camera</button>
