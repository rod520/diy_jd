<script lang="ts">
	import { onMount } from 'svelte';
	import type { VRMHumanBoneName } from '@pixiv/three-vrm';
	import { Face, Hand, Pose as KalidokitPose } from '$lib/shims/kalidokit';
	import type { PoseDetector } from '@tensorflow-models/pose-detection';

	let {
		rigRotation
	}: {
		rigRotation: (
			name: VRMHumanBoneName,
			rotation?: { x: number; y: number; z: number },
			dampener?: number,
			lerpAmount?: number
		) => void;
	} = $props();
	let viewSelfEl: HTMLVideoElement | undefined;
	let handleCamera: () => Promise<void> = async () => {};
	let detector: PoseDetector | undefined;
	let animationFrameId = 0;
	let mediaStream: MediaStream | null = null;

	(() => {
		let stopped = false;
		console.log('yay');
		const processPoseResults = (pose: {
			keypoints: Array<{ x: number; y: number; z?: number; score?: number; name?: string }>;
			keypoints3D?: Array<{ x: number; y: number; z?: number; score?: number; name?: string }>;
		}) => {
			console.log('pose results', pose);

			const videoEl = viewSelfEl;
			if (!videoEl) return;

			const allKeypoints = pose.keypoints;
			const allKeypoints3D = pose.keypoints3D;
			console.log('all keypoints', allKeypoints);
			const poseRig = KalidokitPose.solve(allKeypoints3D, allKeypoints, {
				runtime: 'tfjs',
				video: videoEl,
				imageSize: {
					height: videoEl.videoHeight,
					width: videoEl.videoWidth
				},
				enableLegs: true
			});

			if (!poseRig) return;

			const faceKeypoints = allKeypoints.slice(0, 11);
			const faceRig = Face.solve(faceKeypoints, {
				runtime: 'tfjs',
				video: videoEl
			});

			const leftHandKeypoints = allKeypoints.slice(15, 22);
			const rightHandKeypoints = allKeypoints.slice(17, 24);
			const leftHandRig = Hand.solve(leftHandKeypoints, 'Left');
			const rightHandRig = Hand.solve(rightHandKeypoints, 'Right');
			console.log('hip rotation', poseRig.Hips.rotation);
			rigRotation('hips', poseRig.Hips.rotation, 0.7);
			rigRotation('chest', poseRig.Spine, 0.25, 0.3);
			rigRotation('spine', poseRig.Spine, 0.45, 0.3);
			rigRotation('rightUpperArm', poseRig.RightUpperArm, 1, 0.3);
			rigRotation('rightLowerArm', poseRig.RightLowerArm, 1, 0.3);
			rigRotation('leftUpperArm', poseRig.LeftUpperArm, 1, 0.3);
			rigRotation('leftLowerArm', poseRig.LeftLowerArm, 1, 0.3);
			rigRotation('leftUpperLeg', poseRig.LeftUpperLeg, 1, 0.3);
			rigRotation('leftLowerLeg', poseRig.LeftLowerLeg, 1, 0.3);
			rigRotation('rightUpperLeg', poseRig.RightUpperLeg, 1, 0.3);
			rigRotation('rightLowerLeg', poseRig.RightLowerLeg, 1, 0.3);

			console.log(faceRig, poseRig, rightHandRig, leftHandRig);
		};

		const processFrame = async () => {
			if (stopped) return;

			if (!detector || !viewSelfEl || viewSelfEl.readyState < 2) {
				animationFrameId = requestAnimationFrame(processFrame);
				return;
			}

			const poses = await detector.estimatePoses(viewSelfEl, {
				flipHorizontal: true
			}, performance.now()
		);

			if (poses.length > 0) {
				console.log('poses', poses);
				processPoseResults(poses[0]);
			}

			animationFrameId = requestAnimationFrame(processFrame);
		};

		(async () => {
			const tf = await import('@tensorflow/tfjs-core');
			await import('@tensorflow/tfjs-backend-webgl');
			console.log('imported')
			if (stopped) return;

			await tf.setBackend('webgl');
			await tf.ready();

			const posedetection = await import('@tensorflow-models/pose-detection');
			console.log('posedetection set')

			if (stopped) return;

			detector = await posedetection.createDetector(posedetection.SupportedModels.BlazePose, {
				runtime: 'tfjs',
				modelType: 'lite'
				
			});
		})();

		handleCamera = async () => {
			if (!viewSelfEl) {
				console.log('whoops, no video elemnt');
				return;
			}

			mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			viewSelfEl.srcObject = mediaStream;
			await viewSelfEl.play();

			cancelAnimationFrame(animationFrameId);
			animationFrameId = requestAnimationFrame(processFrame);

			console.log('camera started');
		};
		// Cleanup function to stop the camera and cancel the animation frame
		return () => {
			console.log('cleanup');
			stopped = true;
			cancelAnimationFrame(animationFrameId);
			if (mediaStream) {
				mediaStream.getTracks().forEach((track) => track.stop());
			}
		};
	})();
</script>

<video bind:this={viewSelfEl}>Video stream not available.</video>
<button onclick={handleCamera}>Start Camera</button>
