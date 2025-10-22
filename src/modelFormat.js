import { DefaultSettings, settings, settingsByUUID } from './settings'
import { bus } from './util/bus'
import { store } from './util/store'
import events from './constants/events'
import {safeFunctionName} from "./util/replace";
import { tl } from './util/intl'
import * as basePlayerModelExamples from './assets/player_emote_examples.json';
import * as basePlayerModelBlank from './assets/player_emote_blank.json';

import { fixMinecraftTexturesReferences } from './util/utilz'
import { isJavaCubeOutOfBoundsAdjustScale } from './modelComputation'

import fs from 'fs'

let sus = {};

const FORMATV = '1.0'
const codec = new Codec('iaentitymodel', {
	load_filter: {
		extensions: ['iaentitymodel'],
		type: 'json',
	},
	extension: 'iaentitymodel',
	remember: true,
	id: 'ia/iaentitymodel',
	name: 'ItemsAdder Entity Model',
	description:
		'Blockbench Model format that includes animations and ItemsAdder Entity project data.',
	show_on_start_screen: true,
	bone_rig: true,
	animation_mode: true,
	canvas_limit: false,
	rotate_cubes: true,
	rotation_limit: true,
	animation_files: true,
	icon: 'fa-cube',
	export() {
		var scope = this
		Blockbench.export(
			{
				resource_id: 'model',
				type: scope.name,
				extensions: ['iaentitymodel', 'mcmodel'],
				name: scope.fileName(),
				startpath: scope.startPath(),
				content: scope.compile(),
				custom_writer: isApp ? (a, b) => scope.write(a, b) : null,
			},
			(path) => scope.afterDownload(path)
		)
	},
	load(model, file) {
		newProject(model.meta.type || 'free')
		var name = pathToName(file.path, true)
		if (file.path && isApp && !file.no_file) {
			Project.save_path = file.path
			Project.name = pathToName(name, false)
			addRecentProject({
				name,
				path: file.path,
				icon: 'fa-cube',
			})
		}
		this.parse(model, file.path)
		MenuBar.update()
		bus.dispatch(events.LIFECYCLE.LOAD_MODEL)
	},
	compile(options) {
		if (!options) options = 0
		var model = {
			meta: {
				format_version: FORMATV,
				creation_time: Math.round(new Date().getTime() / 1000),
				backup: options.backup ? true : undefined,
				model_format: Format.id,
				box_uv: Project.box_uv,
				settings: settings.toObject('project'),
				variants: store.get('states'),
				uuid: Project.UUID,
			},
		}

		for (var key in ModelProject.properties) {
			ModelProject.properties[key].copy(Project, model)
		}

		if (Project.overrides) {
			model.overrides = Project.overrides
		}
		model.resolution = {
			width: Project.texture_width || 16,
			height: Project.texture_height || 16,
		}
		if (Interface.Panels.variable_placeholders.inside_vue._data.text) {
			model.animation_variable_placeholders =
				Interface.Panels.variable_placeholders.inside_vue._data.text
		}
		if (options.flag) {
			model.flag = options.flag
		}
		model.elements = []
		elements.forEach((el) => {
			var obj = el.getSaveCopy(model.meta)
			model.elements.push(obj)
		})


		function compileGroups0(undo, lut) {
			var result = []
			function iterate(array, save_array) {
				var i = 0;
				for (var element of array) {
					if (element.type === 'group') {
						var obj = element.compile(undo)

						if (element.children.length > 0) {
							iterate(element.children, obj.children)
						}
						save_array.push(obj)
					} else {
						if (undo) {
							save_array.push(element.uuid)
						} else {
							var index = elements.indexOf(element)
							if (index >= 0) {
								save_array.push(index)
							}
						}
					}
					i++;
				}
			}
			iterate(Outliner.root, result);
			return result;
		}
		model.outliner = compileGroups0(true); // 5.0+ fix
    // model.outliner = compileGroups(true)

		fixMinecraftTexturesReferences();

		model.textures = []
		Texture.all.forEach((tex) => {
			var t = tex.getUndoCopy()
			delete t.selected
			if (options.bitmaps != false) {
				t.source = 'data:image/png;base64,' + tex.getBase64()
				t.mode = 'bitmap'
			}
			model.textures.push(t)
		})

		if (Animator.animations.length) {
			model.animations = []
			Animator.animations.forEach((a) => {
				model.animations.push(a.getUndoCopy({ bone_names: true }, true))
			})
		}

		if (Format.display_mode && Object.keys(display).length >= 1) {
			var new_display = {}
			var entries = 0
			for (var i in DisplayMode.slots) {
				var key = DisplayMode.slots[i]
				if (
					DisplayMode.slots.hasOwnProperty(i) &&
					display[key] &&
					display[key].export
				) {
					new_display[key] = display[key].export()
					entries++
				}
			}
			if (entries) {
				model.display = new_display
			}
		}

		if (options.history) {
			model.history = []
			Undo.history.forEach((h) => {
				var e = {
					before: omitKeys(h.before, ['aspects']),
					post: omitKeys(h.post, ['aspects']),
					action: h.action,
				}
				model.history.push(e)
			})
			model.history_index = Undo.index
		}

		Blockbench.dispatchEvent('save_project', { model })
		this.dispatchEvent('compile', { model, options })

		if (options.raw) {
			return model
		} else if (options.compressed) {
			var json_string = JSON.stringify(model, null, 2)
			var compressed =
				'<lz>' +
				LZUTF8.compress(json_string, {
					outputEncoding: 'StorageBinaryString',
				})
			return compressed
		} else {
			return JSON.stringify(model, null, 2)
		}
	},
	parse(model, path) {
		console.groupCollapsed('Parse .iaentitymodel')

		if (!model.meta) {
			Blockbench.showMessageBox({
				title: "",
				tlKey: 'invalid_model',
				icon: 'error',
			})
			return
		}
		if (!model.meta.format_version) {
			model.meta.format_version = model.meta.format
		}
		if (model.animation_variable_placeholders) {
			Interface.Panels.variable_placeholders.inside_vue._data.text =
				model.animation_variable_placeholders
		}
		if (model.meta.settings) {
			settings.update(model.meta.settings)
			console.log('Got settings from model file', settings)
		} else {
			settings.update(DefaultSettings, true)
		}
		if (model.meta.uuid) {
			Project.UUID = model.meta.uuid
		} else {
			Project.UUID = guid()
		}
		if (model.meta.variants) {
			store.set('states', model.meta.variants)
			console.log('Got states from model file')
		} else {
			store.set('states', { default: {} })
		}
		if (model.meta.model_format) {
			var format = Formats[model.meta.model_format] || Formats.free
			format.select()
		} else if (model.meta.bone_rig) {
			Formats.bedrock_old.select()
		} else {
			Formats.java_block.select()
		}

		Blockbench.dispatchEvent('load_project', { model, path })
		this.dispatchEvent('parse', { model })

		if (model.meta.box_uv !== undefined && Format.optional_box_uv) {
			Project.box_uv = model.meta.box_uv
		}

		for (var key in ModelProject.properties) {
			ModelProject.properties[key].merge(Project, model)
		}

		if (model.overrides) {
			Project.overrides = model.overrides
		}
		if (model.resolution !== undefined) {
			Project.texture_width = model.resolution.width
			Project.texture_height = model.resolution.height
		}

		if (model.textures) {
			model.textures.forEach((tex) => {
				var tex_copy = new Texture(tex, tex.uuid).add(false)
				if (
					isApp &&
					tex.path &&
					fs.existsSync(tex.path) &&
					!model.meta.backup
				) {
					tex_copy.fromPath(tex.path)
				} else if (tex.source && tex.source.substr(0, 5) == 'data:') {
					tex_copy.fromDataURL(tex.source)
				}
				tex_copy.name = tex.name
			})
		}
		if (model.cubes && !model.elements) {
			model.elements = model.cubes
		}
		if (model.elements) {
			model.elements.forEach(function (element) {
				var copy = OutlinerElement.fromSave(element, true)
				for (var face in copy.faces) {
					if (!Format.single_texture && element.faces) {
						var texture =
							element.faces[face].texture !== null &&
							Texture.all[element.faces[face].texture]
						if (texture) {
							copy.faces[face].texture = texture.uuid
						}
					} else if (
						Texture.getDefault() &&
						copy.faces &&
						copy.faces[face].texture !== null
					) {
						copy.faces[face].texture = Texture.getDefault().uuid
					}
				}
				copy.init()
			})
			//   loadOutlinerDraggable();
		}

		if (model.outliner) {
			parseGroups(model.outliner)
			if (model.meta.bone_rig) {
				Canvas.updateAllBones()
				Canvas.updateAllPositions()
			}
		}
		if (model.animations) {
			model.animations.forEach((ani) => {
				var base_ani = new Animation()
				base_ani.uuid = ani.uuid
				base_ani.extend(ani).add()
				if (isApp && Format.animation_files) {
					base_ani.saved_name = base_ani.name
				}
			})
		}
		if (model.display !== undefined) {
			DisplayMode.loadJSON(model.display)
		}
		if (model.history) {
			Undo.history = model.history.slice()
			Undo.index = model.history_index
		}

		this.dispatchEvent('parsed', { model })
		Canvas.updateAll()

		console.groupEnd('Parse .iaentitymodel')

		setTimeout(function() {
			// Hacky trick to refresh the model settings otherwise they would be the default ones for some reason.
			// This is useful only in case the project was opened directly double clicking the file.
			// Cause of this issue is unknown.
			let selectedProjTabIndex = 0;
			ModelProject.all.forEach(function (proj) {
				if(!proj.selected)
					selectedProjTabIndex++;
			})
			Interface.tab_bar.openNewTab()
			ModelProject.all[selectedProjTabIndex].select()
		  }, 500);
	},
})
const format = new ModelFormat({
	id: 'ia/iaentitymodel',
	name: 'ItemsAdder Entity Model',
	description:
		'Blockbench Model format that includes animations and ItemsAdder Entity project data.',
	show_on_start_screen: true,
	bone_rig: true,
	animation_mode: true,
	canvas_limit: false,
	rotate_cubes: true,
	rotation_limit: false,
	uv_rotation: true,
	centered_grid: true,
	animation_files: true,
	animated_textures: true,
	icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAATeSURBVEhL7ZVPbBRVHMd/772Z2WV320JboEBZDBhFQmI0EaMmarh44eCFeiDxQJCDJCQePQGJB6M9eNPEcPBmxHjyogcT78Z/iSBQ2tLuLttuW+hOd2d25r338zvTKewgYBP1xjf55b359/vM9/d+b4Ye67+WyMZN6+29Hx2Qgs4IQYuW3M++uPnenezSprRZoDhZnTwqBJ8lIY5JSJDEw8IXUn0uWHzy6Y0z89m9j9Qjgad3nSvZwuAJTM8KKQ9L2BKkKBmlSIAynQshYxx/Ka2dnLz2zu/rTz9YDwSe3v9h1bDzLhKeQqKRJPl63IP1B4DpeYESKFLfSVd+fOHnt37I0uWUA56ofvB8URbfR4I3lVQO0mRJAUqKmAIlqQyUhrw3T89nx7jzJ6nUZLXa+Xri0oTJEHng0W2nLlYKQydHijup5FRI9SVLYBsJVfoC/SNC9r0M5gPlEg2VK1RUpQPHvnl6OkPAQp8sohP7VFuboUbnJoU6IEe65CqXPMT66JHnuFRwvPXAcdEpYF6gcnELjY2O0pN799LYyCh7nstEvfXkmXJAFw8p4aTNEOguwLM8uzpFftROHSTAu9AUDKDrwU2FxnfuoP3j4zQ8NERCCrbWkjGWwiz3hnLAoiwZTxW1ko7FOsKwoNAEXPfn6OryFVoOltKSpVC43DYwSPt27abqrrG0hAwBYq0xbLRJBt3r5ZE5YEEWo4LcEniy0HWE28MaRYBqy2Qi0+Nae45+XfiFutanJ3bv4bHRESp4LoGRgAxCIyKwQkwCrXVoIjzdp/tLGrjCbbvCawO4ijbx0QJddHzIxD0Y0DEyBHDtSMnGsgYrsgAA1AXRh7O2RsTG+tpoX7qoa59yQE+4vqPcRThroSuXsLHSkCxWcLkN6BqgIQLvzSGK14WvNmAriCXAl+BsWWu7BHAL8xZbdXdLJMoBHZIrgM2jrWtwVcflBhamadg2AbmFWLCcJDarSL4C4AJc3gIc121TW9OEywaqW9dW1zCv6SDQWfpUOSA2Ugvfi2liSmIGSzeLdZ/WpJOxhmgACIBtImnTGsCsrSPxHBzOosYzyQhnM7HWM3iBaTTBI4CsFtDT17XQV0PbuRLE/pXYRlPGxrOakJRNHdAUyEwY4cZYOLE30ZE34PQqXvoysf0T63fd6HiKXB1n2VOpbEz17MhRt6tXg9Vgebmnw7Ym2yE2AcoakkjWLtlW3Bspj4bjW/fctoZa6NAl9GEL/YQ1s4uGeVGgxMSiyZZanbA0+33t4l2XOYdrUbO2YFqXe7o7E7GtKzjAnXUruIYSzsPdepDBscXczMPtPGO94tjW0a0NNEsDaeekx9eEEr+133gp96m572/B4jhNyEUquTRERSvFgEPOIAtTkcIp4fYKOnXgme2Hyi/veyVkwWtkuGM57hLLjhHxmrGF9pAJO3+0WhFdPq4vkMhti4f9D8U5OofFIMcfnipqUahELPDNSsBu6eDwodKL1SORQ6qDfd6NFPvYKD6tDXQbFT86/+PrJvlzQrlNn+hhwA2l4G/plqpsx4eWOhXD7uDhrQfLL1SP9ETM+OMDRBSWd7TiiUvH088h9DfQhv4JuCHcx/QanVfezhuFp7YdKj43/Go0f6fRy8qWAB4K+ZdK1vkrBedJw232hR/r/xLRX/mu8GjfqVFcAAAAAElFTkSuQmCC',
	codec,
	onDeactivation() {
		settingsByUUID.set(Project.uuid, settings.toObject())
	},
	// took from blockbench/js/io/formats/java_block.js
	cube_size_limiter: {
		test(cube, values = 0) {
			if(isJavaCubeOutOfBoundsAdjustScale(cube)) {
				return false;
			}
		},
		move(cube, values = 0) {
			if(isJavaCubeOutOfBoundsAdjustScale(cube)) {
				return false;
			}
		},
		clamp(cube, values = 0) {
			if(isJavaCubeOutOfBoundsAdjustScale(cube)) {
				return false;
			}
		}
	}
})
format.new = function() {
	skin_dialog.show()
	return true
}
const skin_dialog = new Dialog({
	title: tl('iaentitymodel.plugin.title'),
	id: 'skin',
	form: {
		ia_project_type: {
			label: 'Project Type',
			type: 'select',
			default: "entity",
			options: {
				entity: "Custom Entity",
				player_emote_examples: "Player Emotes Pack (with examples)",
				player_emote_blank: "Player Emotes Pack (blank)"
			}
		},
		namespace: {
			label: 'Namespace',
			type: 'string',
			default: "custom"
		},
		identifier: {
			label: 'ID',
			type: 'string',
			default: "entity"
		}
	},
	draggable: true,
	onConfirm(data) {
		if(data.identifier === "" || data.namespace === "") {
			Blockbench.showMessageBox({
				message: data.ia_project_type.startsWith("player_emote")  ? tl("iaentitymodel.settings.playerAnimationsName.errors.invalidFunctionName")
					: tl("iaentitymodel.settings.projectName.errors.invalidFunctionName"),
				icon: 'error'
			})
			return;
		}

		if (newProject(format)) {
			Project.geometry_name = data.identifier;
			settings.iaentitymodel.projectName = safeFunctionName(Project.geometry_name)
			settings.iaentitymodel.namespace = safeFunctionName(data.namespace)
			setProjectTitle(settings.iaentitymodel.projectName)

			if(data.ia_project_type.startsWith("player_emote") ) {

				Project.texture_width = 64;
				Project.texture_height = 64;

				//settings.iaentitymodel.namespace = "iainternal"
				//settings.iaentitymodel.projectName = "player"

				if(data.ia_project_type === 'player_emote_examples') {
					Codecs.project.parse(basePlayerModelExamples)
				} else {
					Codecs.project.parse(basePlayerModelBlank)
				}

				Canvas.updateAllBones()
				Canvas.updateVisibility()
				Canvas.updateAllFaces()
				updateSelection()
			}
		}
		this.hide();
	},
	onCancel() {
		this.hide();
		Format = 0;
	}
});

const isCustomFormat = () => Format.id === format.id

codec.format = format
StartScreen.vue.$forceUpdate()

export { format, codec, isCustomFormat }