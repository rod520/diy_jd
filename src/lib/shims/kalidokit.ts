import {
	Face as FaceValue,
	Hand as HandValue,
	Pose as PoseValue,
	Utils as UtilsValue
} from 'kalidokit/dist/kalidokit.es.js';
import type {
	Face as FaceCtor,
	Hand as HandCtor,
	Pose as PoseCtor,
	Utils as UtilsCtor,
	IFaceSolveOptions,
	IPoseSolveOptions,
	Results,
	Side,
	TFace,
	TPose,
	THand,
	TFVectorPose,
	IHips,
	XYZ,
	EulerRotation,
	RotationOrder,
	AxisMap,
	HandKeys,
	THandUnsafe,
	ISolveOptions,
	LR
} from 'kalidokit';

export const Face: typeof FaceCtor = FaceValue as typeof FaceCtor;
export const Hand: typeof HandCtor = HandValue as typeof HandCtor;
export const Pose: typeof PoseCtor = PoseValue as typeof PoseCtor;
export const Utils: typeof UtilsCtor = UtilsValue as typeof UtilsCtor;

export type {
	IFaceSolveOptions,
	IPoseSolveOptions,
	Results,
	Side,
	TFace,
	TPose,
	THand,
	TFVectorPose,
	IHips,
	XYZ,
	EulerRotation,
	RotationOrder,
	AxisMap,
	HandKeys,
	THandUnsafe,
	ISolveOptions,
	LR
};

