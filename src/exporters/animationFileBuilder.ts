import type * as aj from '../iaentitymodel'

import { tl } from '../util/intl'
import { store } from '../util/store'
import { roundScale, roundToN } from '../util/misc'
import { removeKeyGently } from '../util/misc'
import { generateTree } from '../util/treeGen'
import { CustomError } from '../util/customError'
import { DEFAULT_SCALE_MODEL_KEY, EXPORT_TRANSFORM_ROUNDING, PLAYER_EMOTE_HEAD_Y_OFFSET } from '../constants/compat'
import { isLoopMarker } from '../constants/loopMarkers'

type TreeItem = any
type GeneratedAnimationData = {
	bones: any[]
	animations: any[]
	rotationMode: string
	hitbox?: any
}

declare const Animation: any
declare const Group: any

function isFiniteNumber(value: any) {
	return typeof value === 'number' && Number.isFinite(value)
}

function hasValidTransformFrame(frame: any) {
	return frame &&
		isFiniteNumber(frame.pos?.x) &&
		isFiniteNumber(frame.pos?.y) &&
		isFiniteNumber(frame.pos?.z) &&
		isFiniteNumber(frame.rot?.x) &&
		isFiniteNumber(frame.rot?.y) &&
		isFiniteNumber(frame.rot?.z)
}

function collectBoneTree(boneName: string, animationTreeItem: TreeItem): TreeItem {
	if (animationTreeItem.type === 'layer') {
		return {
			type: 'branch',
			branches: animationTreeItem.items.map((v: any) => collectBoneTree(boneName, v)),
			min: animationTreeItem.min,
			max: animationTreeItem.max,
		}
	}
	return {
		type: 'leaf',
		index: animationTreeItem.index,
		frame: animationTreeItem.item.bones[boneName]
	}
}

function collectEffects(animationTreeItem: TreeItem): TreeItem {
	if (animationTreeItem.type === 'layer') {
		return {
			type: 'branch',
			branches: animationTreeItem.items.map((v: any) => collectEffects(v))
		}
	}
	return {
		type: 'leaf',
		index: animationTreeItem.index,
		effects: animationTreeItem.item.effects
	}
}

function generateEffectsTree(tree: TreeItem): { keyframes: any[] } {
	if (tree.type === 'branch') {
		let keyframes: any[] = []
		// prettier-ignore
		tree.branches.forEach((v: any)=> {
			if (v.type === 'branch') {
				const t = generateEffectsTree(v)
				t.keyframes.forEach(element => {
					keyframes.push(element)
				});

			} else {
				keyframes.push(v.effects)
			}
		})
		return {
			keyframes: keyframes
		};
	}
	return { keyframes: [] }
}

function generateEffects(animationTree: TreeItem) {
	const effectsTmp = generateEffectsTree(collectEffects(animationTree))
	const effects = {
		sounds: {
			keyframes: [] as any[]
		},
		particles: {
			keyframes: [] as any[]
		}
	}

	for (const [dummy, effectFrames] of Object.entries(effectsTmp) as any) {
		effectFrames.forEach((effectFrame: any) => {
			effects.sounds.keyframes.push(effectFrame["sounds"])
			effects.particles.keyframes.push(effectFrame["particles"])
		})
	}
	return effects
}

function generateBoneKeyframes(tree: TreeItem, headYOffset: number): { keyframes: object[] } {
	if (tree.type === 'branch') {
		let keyframes: object[] = []
		// prettier-ignore
		tree.branches.forEach((v: any)=> {
			if (v.type === 'branch') {
				const t = generateBoneKeyframes(v, headYOffset)
				t.keyframes.forEach(element => {
					keyframes.push(element)
				});

			} else {
				let pos = v.frame.pos
				pos = {
					x: roundToN(pos.x, EXPORT_TRANSFORM_ROUNDING),
					y: roundToN(pos.y + headYOffset, EXPORT_TRANSFORM_ROUNDING),
					z: roundToN(pos.z, EXPORT_TRANSFORM_ROUNDING)
				}
				let rot = v.frame.rot
				rot = {
					x: roundToN(rot.x, EXPORT_TRANSFORM_ROUNDING),
					y: roundToN(rot.y, EXPORT_TRANSFORM_ROUNDING),
					z: roundToN(rot.z, EXPORT_TRANSFORM_ROUNDING)
				}

				const scale = roundScale(v.frame.scale)
				const vecStr = `${scale.x}-${scale.y}-${scale.z}`

				// prettier-ignore
				keyframes.push({
					pos: [
						pos.x,
						pos.y,
						pos.z
					],
					rot: [
						rot.x,
						rot.y,
						rot.z
					],
					scale_str: vecStr,
					scale: [
						scale.x,
						scale.y,
						scale.z
					]
				})
			}
		})
		return {
			keyframes: keyframes
		};
	}
	return { keyframes: [] }
}

function getLoopMarkers(animationName: string) {
	const markers = Animation.all.find((x: any) => x.name === animationName)?.markers
	if (!markers) return {}

	let markerStart: any;
	let markerEnd: any;
	markers.forEach((marker: any) => {
		if(isLoopMarker(marker)) {
			if(!markerStart) {
				markerStart = marker
			} else if(!markerEnd) {
				markerEnd = marker
				if(markerEnd.time < markerStart.time) {
					let tmp = markerStart
					markerStart = markerEnd
					markerEnd = tmp
				}
			}
		}
	})

	return {
		...(markerStart ? { loopStartTime: markerStart.time } : {}),
		...(markerEnd ? { loopEndTime: markerEnd.time } : {}),
	}
}

function generateAnimationEntry(animation: aj.RenderedAnimation, bones: aj.BoneObject, headYOffset: number) {
	const touchedBones = Object.keys(animation.frames[0].bones)

	console.log('Animation:', animation)
	const animationTree = generateTree(animation.frames)
	console.log('Animation Tree:', animationTree)

	const effects = generateEffects(animationTree)
	const boneTrees: Record<string, any> = {}
	for (const [boneName, bone] of Object.entries(bones)) {
		if (!touchedBones.includes(boneName)) continue
		const tree = collectBoneTree(boneName, animationTree)
		console.log('Bone Tree:', tree)
		boneTrees[boneName] = generateBoneKeyframes(tree, headYOffset)
	}

	const finalAnimation = {
		name: animation.name,
		animType: animation["animType"] ? animation["animType"] : "other",
		canPlayerMove: animation.canPlayerMove,
		maxDistance: animation.maxDistance,
		loopMode: animation.loopMode,
		length: animation.length,
		bones: boneTrees,
		effects: effects,
		...getLoopMarkers(animation.name),
	}
	console.log('Generated animation:', finalAnimation)
	return finalAnimation
}

function generateBoneData(boneName: string, bone: any, staticFrame: any, scaleModels: aj.ScaleModels, headYOffset: number) {
	let scaledPosRot = staticFrame[boneName]
	if (!hasValidTransformFrame(scaledPosRot)) {
		throw new CustomError('Invalid mount/locator bone transform', {
			intentional: true,
			dialog: {
				id: 'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.invalidBoneTransform',
				title: 'Invalid mount position',
				lines: [
					`Bone "${boneName}" is configured as "${bone.boneType || 'special'}" but its static position/rotation data is missing or invalid. Move the bone slightly, save the project, then export again.`,
				],
				width: 512,
				singleButton: true,
			},
		})
	}

	let boneData = {
		name: boneName,
		boneType: bone.boneType,
		maxHeadRotX: bone.maxHeadRotX,
		maxHeadRotY: bone.maxHeadRotY,
		parents: [],
		pos: [
			roundToN(scaledPosRot.pos.x, EXPORT_TRANSFORM_ROUNDING),
			roundToN(scaledPosRot.pos.y + headYOffset, EXPORT_TRANSFORM_ROUNDING),
			roundToN(scaledPosRot.pos.z, EXPORT_TRANSFORM_ROUNDING)
		],
		rot: [
			roundToN(scaledPosRot.rot.x, EXPORT_TRANSFORM_ROUNDING),
			roundToN(scaledPosRot.rot.y, EXPORT_TRANSFORM_ROUNDING),
			roundToN(scaledPosRot.rot.z, EXPORT_TRANSFORM_ROUNDING)
		],
		scales: scaleModels[boneName] !== undefined ? Object.getOwnPropertyNames(scaleModels[boneName]) : [DEFAULT_SCALE_MODEL_KEY]
	};

	let parentBone = bone["parent"] as any;
	while(parentBone != null && parentBone["type"] === "Object3D") {
		if(parentBone.getGroup() !== undefined) {
			boneData.parents.push(parentBone.getName());
		}

		parentBone = parentBone["parent"] as any;
	}

	return boneData
}

function addHitbox(generatedAnimationData: GeneratedAnimationData) {
	const hitboxGroup = Group.all.find(
		(x: any) => (x["boneType"] === "hitbox" || x.name === "hitbox")
	);

	if (hitboxGroup && hitboxGroup.children.length > 0) {
		const hitboxChild = hitboxGroup.children[0] as any
		generatedAnimationData["hitbox"] = {
			pos: hitboxChild["origin"],
			size: typeof hitboxChild.size === "function"
				? hitboxChild.size()
				: undefined
		};
	}
}

export async function createAnimationFile(
	animations: aj.Animations,
	bones: aj.BoneObject,
	scaleModels: aj.ScaleModels,
	rotationMode: string
): Promise<{ animationFile: string }> {
	const headYOffset = PLAYER_EMOTE_HEAD_Y_OFFSET
	console.log('headYOffset', headYOffset)

	const staticAnimationUuid = store.get('staticAnimationUuid')
	const staticFrame = animations[staticAnimationUuid].frames[0].bones

	animations = removeKeyGently(staticAnimationUuid, animations)

	const generatedAnimationData: GeneratedAnimationData = {
		bones: [],
		animations: [],
		rotationMode: "precise"
	};

	if (!Object.keys(animations).length) {
		throw new CustomError('No Animations Error', {
			intentional: true,
			dialog: {
				id: 'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.noAnimations',
				title: tl(
					'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.noAnimations.title'
				),
				lines: [
					tl(
						'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.noAnimations.body'
					),
				],
				width: 512 + 128,
				singleButton: true,
			},
		})
	}

	for (const animation of Object.values(animations)) {
		if (animation.frames.length <= 1) {
			throw new CustomError('Zero Length Animation Error', {
				intentional: true,
				dialog: {
					id: 'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.zeroLengthAnimation',
					title: tl(
						'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.zeroLengthAnimation.title'
					),
					lines: [
						tl(
							'iaentitymodel.exporters.vanillaAnimation.dialogs.errors.zeroLengthAnimation.body',
							{
								animationName: animation.name,
							}
						),
					],
					width: 512,
					singleButton: true,
				},
			})
		}

		generatedAnimationData.animations.push(generateAnimationEntry(animation, bones, headYOffset));
	}

	for (const [boneName, bone] of Object.entries(bones)) {
		if(boneName === "hitbox" || bone.boneType === "hitbox") continue
		generatedAnimationData.bones.push(generateBoneData(boneName, bone, staticFrame, scaleModels, headYOffset));
	}

	addHitbox(generatedAnimationData)
	generatedAnimationData.rotationMode = rotationMode

	console.log("Finished: ", generatedAnimationData);
	return { animationFile: JSON.stringify(generatedAnimationData) }
}
