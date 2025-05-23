import * as EVENTS from '../constants/events'
import { format as modelFormat } from '../modelFormat'
import { bus } from '../util/bus'
import { safeFunctionName } from '../util/replace'
import { settings } from '../settings'
import { getProjectSaveFolder } from '../util/utilz'

const oldConvertFunc = ModelFormat.prototype.convertTo

ModelFormat.prototype.convertTo = function convertTo() {
	console.log('Running custom convertTo function')
	Undo.history.empty()
	Undo.index = 0
	Project.export_path = ''

	var old_format = Format
	this.select()
	Modes.options.edit.select()
	// Set uuid on project convert 
	if (Format.id === format.id) {
		Project.UUID = guid()
	}

	// Set the current projectName
	if(Project.name === "") {
		let fileName = Project.save_path.replace(/\\/g, '/').split('/').pop().split('.')[0]
		Project.name = fileName
	}
	settings.iaentitymodel.namespace = "custom"
	settings.iaentitymodel.projectName = safeFunctionName(Project.name)

	// Box UV
	if (!this.optional_box_uv) Project.box_uv = this.box_uv

	fixPivots()

	//Bone Rig
	/*if (!Format.bone_rig && old_format.bone_rig) {
		Group.all.forEach((group) => {
			group.rotation.V3_set(0, 0, 0)
		})
	}*/
	if (Format.bone_rig && !old_format.bone_rig) {
		var loose_stuff = []
		Outliner.root.forEach((el) => {
			if (el instanceof Group == false) {
				loose_stuff.push(el)
			}
		})
		if (loose_stuff.length) {
			var root_group = new Group().init().addTo()
			loose_stuff.forEach((el) => {
				el.addTo(root_group)
			})
		}
		if (!Project.geometry_name && Project.name) {
			Project.geometry_name = Project.name
		}
	}
	if (Format.bone_rig) {
		Group.all.forEach((group) => {
			group.createUniqueName()
		})
	}

	if (
		!Format.single_texture &&
		old_format.single_texture &&
		Texture.all.length
	) {
		let texture = Texture.getDefault()
		Outliner.elements
			.filter((el) => el.applyTexture)
			.forEach((el) => {
				el.applyTexture(texture, true)
			})
	}

	//Rotate Cubes
	// if (!Format.rotate_cubes && old_format.rotate_cubes) {
	// 	Cube.all.forEach((cube) => {
	// 		cube.rotation.V3_set(0, 0, 0)
	// 	})
	// }

	//Meshes
	if (!Format.meshes && old_format.meshes) {
		Mesh.all.slice().forEach((mesh) => {
			mesh.remove()
		})
	}

	//Locators
	if (!Format.locators && old_format.locators) {
		Locator.all.slice().forEach((locator) => {
			locator.remove()
		})
	}

	//Texture Meshes
	if (!Format.texture_meshes && old_format.texture_meshes) {
		TextureMesh.all.slice().forEach((tm) => {
			tm.remove()
		})
	}

	//Canvas Limit
	if (
		Format.canvas_limit &&
		!old_format.canvas_limit &&
		!settings.deactivate_size_limit.value
	) {
		Cube.all.forEach(function (s, i) {
			//Push elements into 3x3 block box
			;[0, 1, 2].forEach(function (ax) {
				var overlap = s.to[ax] + s.inflate - 32
				if (overlap > 0) {
					//If positive site overlaps
					s.from[ax] -= overlap
					s.to[ax] -= overlap

					if (16 + s.from[ax] - s.inflate < 0) {
						s.from[ax] = -16 + s.inflate
					}
				} else {
					overlap = s.from[ax] - s.inflate + 16
					if (overlap < 0) {
						s.from[ax] -= overlap
						s.to[ax] -= overlap

						if (s.to[ax] + s.inflate > 32) {
							s.to[ax] = 32 - s.inflate
						}
					}
				}
			})
		})
	}

	//Rotation Limit
	if (
		(Format.id === modelFormat.id && !old_format.rotation_limit) ||
		(Format.rotation_limit &&
			!old_format.rotation_limit &&
			Format.rotate_cubes)
	) {
		Cube.all.forEach((cube) => {
			if (!cube.rotation.allEqual(0)) {
				var axis = cube.rotationAxis() ? getAxisNumber(cube.rotationAxis()) : 0;
				var angle = limitNumber(
					Math.round(cube.rotation[axis] / 22.5) * 22.5,
					-45,
					45
				)
				cube.rotation.V3_set(0, 0, 0)
				cube.rotation[axis] = angle
			}
		})
	}


	// Detect animations names bindings
	const includesMult = (str, arr) => {
		for(let el of arr) {
			if(str.includes(el))
				return true
		}
		return false
	}
	const foundAnims = []
	const animNamesFind = (anim, name, alt) => {
		if(!foundAnims.find(x => x.name === name) && (includesMult(anim.name, alt))) {
			foundAnims.push({
				name: name,
				anim: anim // TODO: Useless data, use a normal array
			})
			//settings.iaentitymodel[`${name}Anim`] = anim.name
			anim.animType = name
			return
		}
		if(anim.animType === undefined)
			anim.animType = "other"
	}
	Animation.all.forEach(anim => {
		animNamesFind(anim, "idle", ["idle"])
		animNamesFind(anim, "walk", ["walk", "walking"])
		animNamesFind(anim, "attack", ["attack", "attacking"])
		animNamesFind(anim, "death", ["death", "dying", "die"])
		animNamesFind(anim, "fly", ["fly", "flying"])
	})


	//Animation Mode
	if (!Format.animation_mode && old_format.animation_mode) {
		Animator.animations.length = 0
	}
	Canvas.updateAllPositions()
	Canvas.updateAllBones()
	Canvas.updateAllFaces()
	updateSelection()

	// Hides the conversion dialog
	hideDialog();

	// Saves the new converted file
	Project.export_path = getProjectSaveFolder() + Project.name + "." + Project.format.codec.extension
	Project.format.codec.export()

	// Updates the current project view save_path variable to be equal to the just saved one
	Project.save_path = Project.export_path

	// Hacky trick to show the ItemsAdder menu on top
	let selectedProjTabIndex = 0;
	ModelProject.all.forEach(function (proj) {
		if(!proj.selected)
			selectedProjTabIndex++;
	})
	Interface.tab_bar.openNewTab()
	ModelProject.all[selectedProjTabIndex].select()
}

bus.on(EVENTS.LIFECYCLE.CLEANUP, () => {
	ModelFormat.prototype.convertTo = oldConvertFunc
})

function fixPivots() {

	// Outliner.elements.forEach(function (element) {
	// 	Outliner.selected.length = 0
	// 	Outliner.selected.push(element)
	// 	// @ts-ignore
	// 	origin2geometry()
	// })
	Cube.all.forEach(function (cube) {
		Outliner.selected.length = 0
		Outliner.selected.push(cube)
		origin2geometry()
	})
}
