export class Pose {
	constructor() {
		throw new Error(
			'This Pose shim only exists so Vite can bundle @tensorflow-models/pose-detection. Use the TFJS runtime, not MediaPipe runtime.'
		);
	}
}

export default Pose;
