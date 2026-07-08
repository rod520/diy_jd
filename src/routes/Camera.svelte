<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import type { VRM } from '@pixiv/three-vrm';
	import { Face, Hand, Pose as KalidokitPose } from '$lib/shims/kalidokit';

	let { gltf }: { gltf?: VRM } = $props();
	let viewSelfEl: HTMLVideoElement | undefined;
	let handleCamera: () => Promise<void> = async () => {};
	let detector: any;
	let animationFrameId = 0;
	let mediaStream: MediaStream | null = null;

	const rigRotation = (
		name: string,
		rotation = { x: 0, y: 0, z: 0 },
		dampener = 1,
		lerpAmount = 0.3
	) => {
		if (!gltf) return;

		const part = gltf.humanoid.getBoneNode(THREE.VRMSchema.HumanoidBoneName[name]);
		if (!part) return;

		const euler = new THREE.Euler(
			rotation.x * dampener,
			rotation.y * dampener,
			rotation.z * dampener,
			(rotation as { rotationOrder?: THREE.EulerOrder }).rotationOrder || 'XYZ'
		);

		const quaternion = new THREE.Quaternion().setFromEuler(euler);
		part.quaternion.slerp(quaternion, lerpAmount);
	};

	onMount(() => {
		let stopped = false;

		const processPoseResults = (pose: {
			keypoints: Array<{ x: number; y: number; z?: number; score?: number; name?: string }>;
			keypoints3D?: Array<{ x: number; y: number; z?: number; score?: number; name?: string }>;
		}) => {
			const videoEl = viewSelfEl;
			if (!videoEl) return;

			const allKeypoints = pose.keypoints;
			const allKeypoints3D = pose.keypoints3D ?? [];

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

			rigRotation('Hips', poseRig.Hips.rotation, 0.7);
			rigRotation('Chest', poseRig.Spine, 0.25, 0.3);
			rigRotation('Spine', poseRig.Spine, 0.45, 0.3);
			rigRotation('RightUpperArm', poseRig.RightUpperArm, 1, 0.3);
			rigRotation('RightLowerArm', poseRig.RightLowerArm, 1, 0.3);
			rigRotation('LeftUpperArm', poseRig.LeftUpperArm, 1, 0.3);
			rigRotation('LeftLowerArm', poseRig.LeftLowerArm, 1, 0.3);
			rigRotation('LeftUpperLeg', poseRig.LeftUpperLeg, 1, 0.3);
			rigRotation('LeftLowerLeg', poseRig.LeftLowerLeg, 1, 0.3);
			rigRotation('RightUpperLeg', poseRig.RightUpperLeg, 1, 0.3);
			rigRotation('RightLowerLeg', poseRig.RightLowerLeg, 1, 0.3);

			console.log(faceRig, poseRig, rightHandRig, leftHandRig);
		};

		const processFrame = async () => {
			if (stopped) return;

			if (!detector || !viewSelfEl || viewSelfEl.readyState < 2) {
				animationFrameId = requestAnimationFrame(processFrame);
				return;
			}

			const poses = await detector.estimatePoses(viewSelfEl, {
				flipHorizontal: false
			});

			if (poses.length > 0) {
				processPoseResults(poses[0]);
			}

			animationFrameId = requestAnimationFrame(processFrame);
		};

		void (async () => {
			const tf = await import('@tensorflow/tfjs-core');
			await import('@tensorflow/tfjs-backend-webgl');

			if (stopped) return;

			await tf.setBackend('webgl');
			await tf.ready();

			const posedetection = await import('@tensorflow-models/pose-detection');

			if (stopped) return;

			detector = await posedetection.createDetector(posedetection.SupportedModels.BlazePose, {
				runtime: 'tfjs',
				modelType: 'full'
			});
		})();

		handleCamera = async () => {
			if (!viewSelfEl) return;

			mediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
			viewSelfEl.srcObject = mediaStream;
			await viewSelfEl.play();

			viewSelfEl.onloadedmetadata = () => {
				cancelAnimationFrame(animationFrameId);
				animationFrameId = requestAnimationFrame(processFrame);
			};
		};

		return () => {
			stopped = true;
			cancelAnimationFrame(animationFrameId);
			mediaStream?.getTracks().forEach((track) => track.stop());
		};
	});
</script>

<video bind:this={viewSelfEl}>Video stream not available.</video>
<button onclick={handleCamera}>Start Camera</button>
