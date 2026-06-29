import { CustomAction } from '../../util/customAction'
import { tl } from '../../util/intl'
import {isInternalElement, isInternalModel, refreshGroupsProperties} from '../../util/utilz'
import { isCustomFormat } from '../../modelFormat'
import { settings } from '../../settings'
import { normalizeHeadBoneCubes } from './headBoneChildren'

let registered = false
let openBoneConfig: Action

export type AJGroup = {
	nbt: string
	head: boolean
	leftHandPivot: boolean
	rightHandPivot: boolean
	mount: boolean
	locator: boolean
	hitbox: boolean
	boneType: string
	maxHeadRotX?: number
	maxHeadRotY?: number
} & Group

const internalForm = {
	boneType: {
		type: 'select',
		label: tl(
			'iaentitymodel.dialogs.boneConfig.boneType'
		),
		value: 'normal',
		options: {
			"normal": tl('iaentitymodel.dialogs.boneConfig.normal'),
			"locator": tl('iaentitymodel.dialogs.boneConfig.locator'),
		}
	}
} as { [formElement: string]: '_' | DialogFormElement }

const form1 = {
	boneType: {
		type: 'select',
		 label: tl(
			 'iaentitymodel.dialogs.boneConfig.boneType'
		 ),
		 value: 'normal',
		options: {
			"normal": tl('iaentitymodel.dialogs.boneConfig.normal'),
			"hatPivot": tl('iaentitymodel.dialogs.boneConfig.hatPivot'),
			"leftHandPivot": tl('iaentitymodel.dialogs.boneConfig.leftHandPivot'),
			"rightHandPivot": tl('iaentitymodel.dialogs.boneConfig.rightHandPivot'),
			"mount": tl('iaentitymodel.dialogs.boneConfig.mount'),
			"locator": tl('iaentitymodel.dialogs.boneConfig.locator'),
			"hitbox": tl('iaentitymodel.dialogs.boneConfig.hitbox'),
			"head": tl('iaentitymodel.dialogs.boneConfig.head'),
		}
	}
} as { [formElement: string]: '_' | DialogFormElement }

const form2 = {
	...form1,
	separator : '_',
	maxHeadRotX: {
		type: 'number',
		 label: tl(
			 'iaentitymodel.dialogs.boneConfig.maxHeadRotX'
		 ),
		 value: 40
	},
	maxHeadRotY: {
		type: 'number',
		 label: tl(
			 'iaentitymodel.dialogs.boneConfig.maxHeadRotY'
		 ),
		 value: 75
	},
} as { [formElement: string]: '_' | DialogFormElement }

function click (ev: any) {
	console.log('Opened bone config')
	// Fucking BlockBench 5.0+ change that makes Group.selected an array
	const selected = (Group.selected as any)[0] as AJGroup
	if (!selected) return
	if (isInternalModel(settings) && isInternalElement(selected.name)) return

	function applyBoneConfig(formData: any, dialog: Dialog) {
		console.log(formData)
		selected.boneType = formData.boneType

		if(selected.boneType === "head") {
			selected.maxHeadRotX = formData.maxHeadRotX ?? 40
			selected.maxHeadRotY = formData.maxHeadRotY ?? 75
			normalizeHeadBoneCubes(selected)
			
			// Apply this change to every other head bone
			for(const group of Group.all as AJGroup[]) {
				if(group.boneType === "head") {
					if(selected.name === group.name)
						continue
					else {
						group.maxHeadRotX = selected.maxHeadRotX
						group.maxHeadRotY = selected.maxHeadRotY
					}
				}
			}
		} else {
			selected.maxHeadRotX = undefined
			selected.maxHeadRotY = undefined
		}

		// If hitbox, set texture to completely transparent
		if (selected.boneType === "hitbox") {
			for (const group of Group.all as AJGroup[]) {
				if (group.boneType === "hitbox") {
					if (selected.name === group.name) {
						selected.children.forEach((child) => {
							if (child instanceof Cube) {
								let cube = child as Cube
								// @ts-ignore
								for (const key of Object.keys(cube.faces)) {
									// @ts-ignore
									const face = cube.faces[key];
									face.texture = null; // To make it transparent
								}
							}
						});
					}
				}

				// To force updating the textures which I just made transparent
				Canvas.updateAll()
			}
		}

		refreshGroupsProperties()
		dialog.hide()
	}

	let form = form1;
	if(isInternalModel(settings)) {
		form = internalForm
	} else {
		if (selected.boneType === "head")
			form = form2;
	}
	form.boneType = {
		...(form.boneType as DialogFormElement),
		value: selected.boneType || 'normal',
	}
	if(selected.boneType === "head") {
		form.maxHeadRotX = {
			...(form.maxHeadRotX as DialogFormElement),
			value: selected.maxHeadRotX ? selected.maxHeadRotX : 40,
		}
		form.maxHeadRotY = {
			...(form.maxHeadRotY as DialogFormElement),
			value: selected.maxHeadRotY ? selected.maxHeadRotY : 75,
		}
	}

	const dialog = new Dialog({
		title: tl('iaentitymodel.dialogs.boneConfig.title'),
		id: 'boneConfig',
		form: form,
		onConfirm: (formData: any) => {
			const selectedCubes = selected.children.filter((child) => child instanceof Cube)
			if(formData.boneType === "hitbox" && selectedCubes.length > 1) {
				Blockbench.showMessageBox({
					message: tl('iaentitymodel.dialogs.boneConfig.hitboxMultiCubeWarning'),
					icon: 'warning',
					width: 420,
					buttons: ['OK', 'Cancel'],
					confirm: 0,
					cancel: 1,
				}, (result) => {
					if(result === 0) applyBoneConfig(formData, dialog)
				})
				return
			}

			applyBoneConfig(formData, dialog)
		}
	}).show()

}

export function registerBoneConfigMod() {
	if (registered) return
	registered = true

	openBoneConfig = CustomAction('iaentitymodel.BoneConfig', {
		name: 'Bone Config',
		icon: 'fas.fa-bone',
		category: 'edit',
		condition: () => {
			const selected = (Group.selected as any)?.[0]
			return isCustomFormat() && !!selected && !(isInternalModel(settings) && isInternalElement(selected.name))
		},
		click: click,
	})

	// Properties registration to make Blockbench save them in the project file
	new Property(Group, 'string', 'boneType', {
		default: () => '',
		exposed: true,
		condition: (val: any) => val !== undefined && val !== "" && val !== "normal"
	})
	new Property(Group, 'number', 'maxHeadRotX', {
		default: () => undefined,
		exposed: true,
		condition: (val: any) => val !== undefined && val !== ""
	})
	new Property(Group, 'number', 'maxHeadRotY', {
		default: () => undefined,
		exposed: true,
		condition: (val: any) => val !== undefined && val !== ""
	})

	// @ts-ignore
	Group.prototype.menu.structure.splice(3, 0, openBoneConfig)
	// @ts-ignore
	openBoneConfig.menus.push({ menu: Group.prototype.menu, path: '' })
	// @ts-ignore
	openBoneConfig.pushToolbar(Toolbars.outliner, 2)
}