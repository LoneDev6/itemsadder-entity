import type * as aj from './iaentitymodel'

import * as fs from 'fs'

import { tl, intl } from './util/intl'
// @ts-ignore
import lang_cz from './lang/cz.yaml'
intl.register('cz', lang_cz)
// @ts-ignore
import lang_de from './lang/de.yaml'
intl.register('de', lang_de)
// @ts-ignore
import lang_en from './lang/en.yaml'
intl.register('en', lang_en)
// @ts-ignore
import lang_es from './lang/es.yaml'
intl.register('es', lang_es)
// @ts-ignore
import lang_fr from './lang/fr.yaml'
intl.register('fr', lang_fr)
// @ts-ignore
import lang_it from './lang/it.yaml'
intl.register('it', lang_it)
// @ts-ignore
import lang_ja from './lang/ja.yaml'
intl.register('ja', lang_ja)
// @ts-ignore
import lang_nl from './lang/nl.yaml'
intl.register('nl', lang_nl)
// @ts-ignore
import lang_pl from './lang/pl.yaml'
intl.register('pl', lang_pl)
// @ts-ignore
import lang_pt from './lang/pt.yaml'
intl.register('pt', lang_pt)
// @ts-ignore
import lang_ru from './lang/ru.yaml'
intl.register('ru', lang_ru)
// @ts-ignore
import lang_sv from './lang/sv.yaml'
intl.register('sv', lang_sv)
// @ts-ignore
import lang_zh from './lang/zh.yaml'
intl.register('zh', lang_zh)
// @ts-ignore
import lang_zh_tw from './lang/zh_tw.yaml'
intl.register('zh_tw', lang_zh_tw)

import './lifecycle'
import './rotationSnap'
import './ui/panel/states'
import './ui/dialogs/settings'
import { bus } from './util/bus'
import { store } from './util/store'
import { ERROR } from './util/errors'
import EVENTS from './constants/events'
import { CustomError } from './util/customError'
import { CustomAction } from './util/customAction'
import { format as modelFormat } from './modelFormat'
import { renderAnimation } from './animationRenderer'
import { DefaultSettings, settings } from './settings'
import {getModelExportFolder, needsToExportJsonsModels, isInternalElement} from "./util/utilz";

// import { makeArmorStandModel } from './makeArmorStandModel'

import {
	exportRigModels,
	exportTransparentTexture,
} from './exporting'

import {
	computeElements,
	computeModels,
	computeVariantTextureOverrides,
	computeBones,
	computeVariantModels,
	computeScaleModels,
} from './modelComputation'


async function fetchJson(url, {
  method = 'GET',
  headers = {},
  body = undefined,
  timeoutMs = 10000,
  token = null
} = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'iaentity-plugin',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...headers
      },
      body,
      credentials: 'omit',
      signal: ctrl.signal
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');

    const data = isJson ? await res.json() : await res.text();

    // Build an axios-like response
    const response = {
      data,                          // parsed body
      status: res.status,            // status code
      statusText: res.statusText,    // status text
		// @ts-ignore
	  headers: Object.fromEntries(res.headers.entries()),
      url: res.url,
      ok: res.ok,                    // convenience flag
      request: { url, method }       // minimal request info
    };

    if (!res.ok) {
      const err = new Error(`HTTP ${res.status} ${res.statusText}`);
			// @ts-ignore
      err.response = response;
      throw err;
    }

    return response;
  } finally {
    clearTimeout(t);
  }
}

async function checkForUpdates() {
    try {
        // Get the current version from the environment variable
        const currentVersion = process.env.PLUGIN_VERSION;
        if (!currentVersion) {
            throw new Error('Current version is not defined in the environment variables.');
        }

        // Fetch the latest release from GitHub
        const { data } = await fetchJson('https://api.github.com/repos/LoneDev6/itemsadder-entity/releases/latest');
  			const latestVersion = data.tag_name;

        if (latestVersion !== currentVersion) {
					console.log('A new update is available!');

					// @ts-ignore
					Blockbench.showMessageBox({
						title: 'A new update is available!',
						icon: 'update',
						message: `A new update ItemsAdder extension is available! Download version ${latestVersion} from the releases page.`,
						buttons: ['Download', 'Later'],
					}, (buttonIdx) => {
						if(buttonIdx === 0) {

							// Iterate response.data.assets and get the .js file URL
							// Open the URL in the default browser
							data.assets.forEach((asset: any) => {
								if (asset.name.endsWith('.js')) {
									//require('electron').shell.openExternal(asset.browser_download_url);
									
									// Uninstall the plugin
									// @ts-ignore
									Plugins.all.find(p => p.id == "iaentitymodel").uninstall()

									// Install from URL
									// @ts-ignore
									new Plugin().loadFromURL(asset.browser_download_url, true)
								}
							});
						}
					});
        }
    } catch (error) {
        console.error('Error checking for updates:', error);
    }
}

// Call the function to check for updates
checkForUpdates();

export const BuildModel = (callback: any, options: any) => {
	if (!IAENTITY.exportInProgress) {
		IAENTITY.exportInProgress = true
		computeAnimationData(callback, options)
			.then(() => {
				IAENTITY.exportInProgress = false
			})
			.catch((e) => {
				IAENTITY.exportInProgress = false
				Blockbench.setProgress(0)
				if (
					e instanceof CustomError &&
					e.options.intentional &&
					e.options.silent
				) {
					// @ts-ignore
					Blockbench.showQuickMessage(
						tl('iaentitymodel.popups.exportCancelled')
					)
					console.log('Intentional Error:', e.message)
					throw e
				} else {
					console.log('Unknown Error:')
					throw e
				}
			})
	} else {
		Blockbench.showQuickMessage(tl('iaentitymodel.popups.exportInProgress'))
		ERROR.IAENTITY_BUSY()
	}
}

async function computeAnimationData(
	callback: (data: any) => any,
	options: any
) {
	console.groupCollapsed('Compute Animation Data')

	if(isInternalModel(settings)) {
		// Or getModelExportFolder won't work
		if(!Project.save_path) {
			return;
		}

		const modelExportFolder = getModelExportFolder(settings)
		// Both files exists and it's not good!
		if(
			(needsToExportJsonsModels(settings) && fs.existsSync(`${modelExportFolder}/.player_animations`)) ||
			(!needsToExportJsonsModels(settings) && fs.existsSync(`${modelExportFolder}/.player_advanced_animations`))
		) {
			// Delete all useless files.
			fs.readdirSync(
				modelExportFolder
			).forEach(f => {
				// To be 100% sure we are not deleting files which the user might have put there because they are an idiot.
				if(f.endsWith(".json") || f.endsWith(".player_animations") || f.endsWith(".player_advanced_animations")) {
					fs.rmSync(`${modelExportFolder}/${f}`)
				}
			});
		}
	}

	const animations = (await renderAnimation(options)) as aj.Animations
	const cubeData: aj.CubeData = computeElements()
	const models: aj.ModelObject = await computeModels(cubeData)
	const variantTextureOverrides = computeVariantTextureOverrides(
		models
	) as aj.VariantTextureOverrides
	const bones = computeBones(models, animations) as aj.BoneObject
	// const [variantModels, variantTouchedModels] = await computeVariantModels(models, variantTextureOverrides)
	const scaleModels = computeScaleModels(bones)
	const variants = (await computeVariantModels(
		models,
		scaleModels,
		variantTextureOverrides
	)) as {
		variantModels: aj.VariantModels
		scaleModels: aj.ScaleModels
		variantTouchedModels: aj.variantTouchedModels
	}

	// const flatVariantModels = {}
	// Object.values(variantModels).forEach(variant => Object.entries(variant).forEach(([k,v]) => flatVariantModels[k] = v))
	// console.log('Flat Variant Models:', flatVariantModels)

	//if(!isInternalModel(settings)) {
	if(needsToExportJsonsModels(settings)) {
		await exportRigModels(models, variants.variantModels, scaleModels)
		if (settings.iaentitymodel.transparentTexturePath) {
			await exportTransparentTexture()
		}
	}

	const data = {
		settings: settings.toObject() as aj.GlobalSettings,
		cubeData,
		bones,
		models,
		scaleModels,
		variantTextureOverrides,
		variantModels: variants.variantModels,
		variantTouchedModels: variants.variantTouchedModels,
		animations,
	}
	console.groupEnd()
	console.groupCollapsed('Exporter Output')
	await callback(data)
	console.groupEnd()
}

import './pluginDefinitions'
import { show_settings } from './ui/dialogs/settings'
import { show_about } from './ui/dialogs/about'

const menu: any = new BarMenu(
	'iaentitymodel',
	[],
	() => Format.id === modelFormat.id
)
menu.label.style.display = 'none'
document.querySelector('#menu_bar').appendChild(menu.label)

function safeQuerySelector(selector, fallback = undefined) {
	let a = document.querySelector(selector)
	if(!a && fallback)
		a = document.querySelector(fallback)
	return a
}

let prevAnimationTabTitle = "ANIMATIONS";
function hideEditPaintTabs() {
	// @ts-ignore // Hide the texture editor tab
	safeQuerySelector("#mode_selector > li:nth-child(2)")?.style.setProperty("display",  "none")
	// @ts-ignore
	safeQuerySelector(".tool.resize_tool")?.style.setProperty("display",  "none")
	// @ts-ignore
	safeQuerySelector(".tool.pivot_tool")?.style.setProperty("display",  "none")

	// @ts-ignore
	if(Modes.options.edit.selected) {
		// @ts-ignore // Hide the add cube button
		safeQuerySelector(".tool.add_cube")?.style.setProperty("display",  "none")
		// @ts-ignore // Hide the textures bottom left panel
		safeQuerySelector("#textures", "#panel_textures")?.style.setProperty("display",  "none")
		// @ts-ignore // Hide the UV bottom left panel
		safeQuerySelector("#uv", "#panel_uv")?.style.setProperty("display",  "none")

		let animationsTitle = safeQuerySelector("#animations > h3 > label", "#panel_animations > h3 > label > span")
		if(animationsTitle) {
			// @ts-ignore
			prevAnimationTabTitle = animationsTitle.innerText
			// @ts-ignore
			animationsTitle.innerText = "PLAYER EMOTES"
		}
	}
}

function restoreEditPaintTabs() {
	// @ts-ignore // Show the texture editor tab
	safeQuerySelector("#mode_selector > li:nth-child(2)")?.style.removeProperty("display")
	// @ts-ignore
	safeQuerySelector(".tool.resize_tool")?.style.removeProperty("display")
	// @ts-ignore
	safeQuerySelector(".tool.pivot_tool")?.style.removeProperty("display")

	// @ts-ignore
	if(Modes.options.edit.selected) {
		// @ts-ignore // Show the add cube button
		safeQuerySelector(".tool.add_cube")?.style.removeProperty("display")
		// @ts-ignore // Show the textures bottom left panel
		safeQuerySelector("#textures", "#panel_textures")?.style.removeProperty("display")
		// @ts-ignore // Show the UV bottom left panel
		safeQuerySelector("#uv", "#panel_uv")?.style.removeProperty("display")

		let animationsTitle = safeQuerySelector("#animations > h3 > label", "#panel_animations > h3 > label > span")
		if(animationsTitle) {
			// @ts-ignore
			animationsTitle.innerText = prevAnimationTabTitle
		}
	}
}

function restoreHiddenUI() {
	// Show the "variable placeholders" panel under the keyframe coords
	// @ts-ignore
	Interface.Panels.variable_placeholders.node.style.visibility = "visible"

	// @ts-ignore
	Modes.options.edit.select()
	restoreEditPaintTabs()
}
global.LONEDEV_DEBUG_restoreHiddenUI = restoreHiddenUI

// @ts-ignore
Blockbench.on('select_project', () => {
	queueMicrotask(() => {
		console.log('selected', Format.id !== modelFormat.id)
		menu.label.style.display = Format.id !== modelFormat.id ? 'none' : 'inline-block'

		if(Format.id === modelFormat.id) {

			if(!global?.LONEDEV_DEBUG) {
				refreshGroupsProperties()
				// Hide the "variable placeholders" panel under the keyframe coords
				// @ts-ignore
				Interface.Panels.variable_placeholders.node.style.visibility = "hidden"

				/*if (isInternalModel(settings)) {
					// @ts-ignore
					Modes.options.animate.select()
					hideEditPaintTabs()
				} else {*/
					// @ts-ignore
					Modes.options.edit.select()
					restoreEditPaintTabs()
				//}

				// Hide the sus bone
				// @ts-ignore
				let susbone = document.querySelector("#\\37 7440795-2e48-1bbd-3fee-ed8401fb4688");
				if (susbone) {
					// @ts-ignore
					susbone.style.setProperty("display",  "none")

					// @ts-ignore
					Group.uuids['77440795-2e48-1bbd-3fee-ed8401fb4688'].children.forEach(c => c.visibility = false);
					Canvas.updateVisibility()
				}
			}
		}
		else {
			restoreHiddenUI()
		}
	})
})
// @ts-ignore
Blockbench.on('add_group', () => {
	if(Format.id === modelFormat.id) {
		refreshGroupsProperties()
	}
})
// @ts-ignore
Blockbench.on('group_elements', () => {
	if(Format.id === modelFormat.id) {
		refreshGroupsProperties()
	}
})
// @ts-ignore
Blockbench.on('add_cube', () => {
	if(Format.id === modelFormat.id) {
		refreshGroupsProperties()

		/*if(isInternalModel(settings)) {
			alert("This is not currently supported. You can only add bones and mark them to `locator`. Please delete the cube.")
		}*/
	}
})


{
	// Intercept removal of element and cancel it if it's an internal element.
	let old = OutlinerNode.prototype.remove;
    OutlinerNode.prototype.remove = new Proxy(old, {
      apply: function(target, thisArg, argumentsList) {
        console.log("Tried to remove an element.");
		if(isInternalElement(thisArg.name) || isInternalElement(thisArg.parent.name))
		{
			console.log("Cancelled removal of internal bone.");
			alert("You can't delete builtin entity bones.")
			// Use exception instead of return to cancel the whole chain removal of sub-elements
			// or it would spam one msgbox for each child element.
			throw new Error('You can\'t delete builtin entity bones.'); 
		}

        return target.call(thisArg);
      }
    });
}

Blockbench.on('select_mode', () => {
	refreshGroupsProperties()
	/*if(isInternalModel(settings)) {
		hideEditPaintTabs()
	}
	else {*/
		restoreEditPaintTabs()
	//}

	global.invalidCubeNotification?.delete();
	delete global.invalidCubeNotification;
})

// Dirty
document.body.addEventListener('click', () => {
	refreshGroupsProperties()
}, true);

// @ts-ignore
Blockbench.on('unselect_project', () => {
	menu.label.style.display = 'none'
})
// @ts-ignore
import logo from './assets/itemsadder_icon.png'
import {isInternalModel, refreshGroupsProperties} from './util/utilz'
import { safeFunctionName } from './util/replace'
menu.label.innerHTML = tl('iaentitymodel.menubar.dropdown')
let img = document.createElement('img')
img.src = logo
img.width = 16
img.height = 16
img.style.position = 'relative'
img.style.top = '2px'
img.style.borderRadius = '8px'
img.style.marginRight = '5px'
menu.label.prepend(img)

MenuBar.addAction(
	CustomAction('iaentitymodel_settings', {
		icon: 'settings',
		category: 'iaentitymodel',
		name: tl('iaentitymodel.menubar.settings'),
		condition: () => modelFormat.id === Format.id /*&& !isInternalModel(settings)*/,
		click: function () {
			show_settings()
		},
	}),
	'iaentitymodel'
)
MenuBar.addAction(
	{
		// @ts-ignore
		name: tl('iaentitymodel.menubar.export'),
		id: 'iaentitymodel.export',
		icon: 'insert_drive_file',
		condition: () => modelFormat.id === Format.id,
		click: () => {
			if(!Project.saved || (!Project.save_path || Project.save_path === "")) {
				Blockbench.showQuickMessage(tl('iaentitymodel.popups.projectNotSaved'))
				return;
			}

			// Call the selected exporter.
			// @ts-ignore
			store.getStore('exporters').get("vanillaAnimationExporter")()
		},
		keybind: new Keybind({
			key: 120, // f9
		}),
	},
	'iaentitymodel'
)
MenuBar.addAction(
	CustomAction('iaentitymodel_about', {
		icon: 'help',
		category: 'iaentitymodel',
		name: tl('iaentitymodel.menubar.about'),
		condition: () => modelFormat.id === Format.id,
		click: function () {
			show_about()
		},
	}),
	'iaentitymodel'
)
MenuBar.update()
const cb = () => {
	store.set('states', { default: {} })
	settings.update(DefaultSettings, true)
	bus.dispatch(EVENTS.LIFECYCLE.LOAD_MODEL, {})
}
Blockbench.on('new_project', cb)
bus.on(EVENTS.LIFECYCLE.CLEANUP, () => {
	menu.label.remove()
	// @ts-ignore
	Blockbench.removeListener('new_project', cb)
	// @ts-ignore
	Blockbench.removeListener('select_mode', cb)
})


new Property(KeyframeDataPoint, 'string', 'name', {label: "Name", condition: point => Format.id === modelFormat.id && ['particle', 'sound'].includes(point.keyframe.channel), default: "minecraft:XXXXX"},);
new Property(KeyframeDataPoint, 'number', 'volume', {label: "Volume", condition: point => Format.id === modelFormat.id && 'sound' == point.keyframe.channel, default: 1},);
new Property(KeyframeDataPoint, 'number', 'pitch', {label: "Pitch", condition: point => Format.id === modelFormat.id && 'sound' == point.keyframe.channel, default: 1});

new Property(KeyframeDataPoint, 'string', 'locator_name', {label: "Bone (locator)", condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: "locator_bone_name"} );
new Property(KeyframeDataPoint, 'number', 'speed', {label: "Speed", condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 1});
new Property(KeyframeDataPoint, 'number', 'count', {label: "Count", condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 1});
new Property(KeyframeDataPoint, 'number', 'x_delta', { label: 'X delta', condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 0 });
new Property(KeyframeDataPoint, 'number', 'y_delta', { label: 'Y delta', condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 0 });
new Property(KeyframeDataPoint, 'number', 'z_delta', { label: 'Z delta', condition: point => Format.id === modelFormat.id && 'particle' == point.keyframe.channel, default: 0 });

// Edit the Bedrock effect animator "script", "locator", "file" properties condition to hide itself if this project has our custom model format
KeyframeDataPoint["properties"].effect.condition = (point) => { return Format.id !== modelFormat.id && ['particle', 'sound'].includes(point.keyframe.channel) }
KeyframeDataPoint["properties"].script.condition = (point) => { return Format.id !== modelFormat.id && ['particle', 'timeline'].includes(point.keyframe.channel) }
KeyframeDataPoint["properties"].locator.condition = (point) => { return Format.id !== modelFormat.id && 'particle' == point.keyframe.channel }
KeyframeDataPoint["properties"].file.condition = (point) => { return Format.id !== modelFormat.id && ['particle', 'sound'].includes(point.keyframe.channel) }

