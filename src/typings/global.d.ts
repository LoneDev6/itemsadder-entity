import * as THREE from 'three'
declare global {
	var AJ: any
	const IAENTITY: any
	function autoStringify(obj: any): string
	var THREE: typeof import('three')
	var konsole: Console
	// var NodePreviewController: any
}
export { AJ, THREE }

export type Modify<T, R> = Omit<T, keyof R> & R

// export type AJGeneralAnimator = {
// 	type: 'bone' | string
// 	channels: {
// 		rotation: any
// 		position: any
// 		scale: any
// 	}
// 	interpolate: (
// 		channel: 'rotation' | 'position' | 'scale',
// 		allow_expression?: boolean,
// 		axis?: string
// 	) => [number, number, number] | number | false
// }

// export type AJBoneAnimator = {

// } & AJGeneralAnimator

// export type AJAnimation = {
// 	uuid: string
// 	getBoneAnimator: (group: Group) => AJBoneAnimator
// } & Animation

// export type AJGroup = Modify<Group, {
// 	mesh: THREE.Object3D
// 	all: AJGroup[]
// }>
