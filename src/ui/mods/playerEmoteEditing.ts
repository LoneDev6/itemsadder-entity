declare const Modes: any
declare const Interface: any
declare const Cube: any
declare const Texture: any
declare const Blockbench: any
declare const Group: any
declare const Canvas: any
declare const Project: any

import { BUILTIN_PLAYER_TEXTURE_UUID, hasInternalPlayerSkeleton, INTERNAL_PLAYER_BONE_NAME_SET } from '../../constants/internalPlayer'
import { setVariablePlaceholdersVisible } from '../adapters/variablePlaceholders'
let settings: any

export function configurePlayerEmoteEditing(settingsRef: any) {
	settings = settingsRef
}

function isInternalElement(name: string) {
	return INTERNAL_PLAYER_BONE_NAME_SET.has(name)
}

function isInternalModel(settings: any) {
	return hasInternalPlayerSkeleton(Group.all)
}

export function safeQuerySelector(selector: string, fallback?: string) {
	let element = document.querySelector(selector) as HTMLElement
	if (!element && fallback) {
		element = document.querySelector(fallback) as HTMLElement
	}
	return element
}

let prevAnimationTabTitle = 'ANIMATIONS'

export function hideEditPaintTabs() {
	safeQuerySelector('#mode_selector > li:nth-child(2)')?.style.setProperty('display', 'none')
	safeQuerySelector('.tool.resize_tool')?.style.setProperty('display', 'none')
	safeQuerySelector('.tool.pivot_tool')?.style.setProperty('display', 'none')

	if (Modes.options.edit.selected) {
		safeQuerySelector('.tool.add_cube')?.style.setProperty('display', 'none')
		safeQuerySelector('#textures', '#panel_textures')?.style.setProperty('display', 'none')
		safeQuerySelector('#uv', '#panel_uv')?.style.setProperty('display', 'none')

		const animationsTitle = safeQuerySelector('#animations > h3 > label', '#panel_animations > h3 > label > span')
		if (animationsTitle) {
			prevAnimationTabTitle = animationsTitle.innerText
			animationsTitle.innerText = 'PLAYER EMOTES'
		}
	}
}

export function restoreEditPaintTabs() {
	safeQuerySelector('#mode_selector > li:nth-child(2)')?.style.removeProperty('display')
	safeQuerySelector('.tool.resize_tool')?.style.removeProperty('display')
	safeQuerySelector('.tool.pivot_tool')?.style.removeProperty('display')

	if (Modes.options.edit.selected) {
		safeQuerySelector('.tool.add_cube')?.style.removeProperty('display')
		safeQuerySelector('#textures', '#panel_textures')?.style.removeProperty('display')
		safeQuerySelector('#uv', '#panel_uv')?.style.removeProperty('display')

		const animationsTitle = safeQuerySelector('#animations > h3 > label', '#panel_animations > h3 > label > span')
		if (animationsTitle) {
			animationsTitle.innerText = prevAnimationTabTitle
		}
	}
}

export function restoreHiddenUI() {
	setVariablePlaceholdersVisible(true)
	Modes.options.edit.select()
	restoreEditPaintTabs()
}

function setHierarchyItemHidden(uuid: string, hidden: boolean) {
	const item = document.getElementById(uuid)
	if (item) item.style.setProperty('display', hidden ? 'none' : '')
}

function findVueTextureListItem(texture: any) {
	const panel = safeQuerySelector('#textures', '#panel_textures')
	if (!panel) return null

	for (const element of Array.from(panel.querySelectorAll('*')) as any[]) {
		const vueTexture = element.__vue__?.texture || element.__vue__?.tex || element.__vueParentComponent?.props?.texture
		if (vueTexture?.uuid === texture.uuid) {
			return element.closest('li, .texture, .texture_entry, .texture_item, .list_item') || element
		}
	}

	return null
}

function setTextureListItemHidden(texture: any, hidden: boolean) {
	const escapedUuid = CSS.escape(texture.uuid)
	const selectors = [
		`#${escapedUuid}`,
		`[texid="${escapedUuid}"]`,
		`[texture_id="${escapedUuid}"]`,
		`[texture_uuid="${escapedUuid}"]`,
		`[uuid="${escapedUuid}"]`,
		`[data-uuid="${escapedUuid}"]`,
		`[data-texture-uuid="${escapedUuid}"]`,
	]
	let item = document.querySelector(selectors.join(',')) as HTMLElement
	if (!item) item = findVueTextureListItem(texture) as HTMLElement
	if (item) item.style.setProperty('display', hidden ? 'none' : '')
}

function isBuiltinPlayerCube(cube: any) {
	return isInternalModel(settings) && cube instanceof Cube && isInternalElement((cube.parent as any)?.name)
}

function isBuiltinPlayerTexture(texture: any) {
	return isInternalModel(settings) && texture?.uuid === BUILTIN_PLAYER_TEXTURE_UUID
}

export function hideBuiltinPlayerEditParts() {
	if (!isInternalModel(settings)) return

	Cube.all.forEach((cube: any) => {
		if (!isBuiltinPlayerCube(cube)) return
		setHierarchyItemHidden(cube.uuid, true)
		cube.locked = true
	})

	Texture.all.forEach((texture: any) => {
		if (!isBuiltinPlayerTexture(texture)) return
		setTextureListItemHidden(texture, true)
	})
}

export function preventBuiltinPlayerPaintSelection() {
	if (!isInternalModel(settings) || !(globalThis as any).Modes.options.paint.selected) return

	const selectedBuiltinCube = Cube.selected?.find((cube: any) => isBuiltinPlayerCube(cube))
	const selectedBuiltinTexture = (Texture as any).selected && isBuiltinPlayerTexture((Texture as any).selected)
	if (!selectedBuiltinCube && !selectedBuiltinTexture) return

	Cube.selected.empty?.()
	;(Texture as any).selected = Texture.all.find((texture: any) => !isBuiltinPlayerTexture(texture)) || null
	Blockbench.showQuickMessage('Builtin player parts cannot be painted')
}

function getNewlyAddedCube() {
	return Cube.selected?.[0] || Cube.all[Cube.all.length - 1]
}

export function ensureUserCubeHasEditableParent() {
	if (!isInternalModel(settings)) return

	const cube = getNewlyAddedCube()
	if (!cube || !(cube instanceof Cube)) return

	const parent = cube.parent as any
	const isRootCube = !parent || parent === 'root'
	const isChildOfBuiltinBone = isInternalElement(parent?.name)
	if (!isRootCube && !isChildOfBuiltinBone) return

	const parentForNewBone = isChildOfBuiltinBone ? parent : undefined
	const bone = new Group({ name: 'custom_bone' }).init().addTo(parentForNewBone)
	bone.createUniqueName()
	cube.addTo(bone)
	bone.openUp()
	;(bone as any).select()
	Canvas.updateAll()
	if (Project) Project.saved = false
}