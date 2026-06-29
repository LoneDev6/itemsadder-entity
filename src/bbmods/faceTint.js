import { format as modelFormat } from '../modelFormat'
import minecraftIcon from '../assets/mc-build.png'
import { bus } from '../util/bus'
import * as EVENTS from '../constants/events'

const MINECRAFT_ASSETS_RAW_BASE_URL = 'https://raw.githubusercontent.com/InventivetalentDev/minecraft-assets'
const MINECRAFT_ASSETS_FILE_BASE_URL = 'https://assets.mcasset.cloud'
const MOJANG_VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
const VANILLA_TEXTURE_PREVIEW_ID = 'iaentitymodel_vanilla_texture_preview'

let registered = false
let originalFaceTintCondition
let originalFaceTintSliderCondition

function getListUrl(version, relativePath) {
	return `${MINECRAFT_ASSETS_RAW_BASE_URL}/${version}/assets/minecraft/textures/${relativePath ? `${relativePath}/` : ''}_list.json`
}

function getTextureFileUrl(version, relativePath) {
	return `${MINECRAFT_ASSETS_FILE_BASE_URL}/${version}/assets/minecraft/textures/${relativePath}`
}

async function fetchJson(url) {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
	return response.json()
}

async function fetchDataUrl(url) {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
	const blob = await response.blob()
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => resolve(reader.result)
		reader.onerror = reject
		reader.readAsDataURL(blob)
	})
}

async function getMinecraftReleaseVersions() {
	const manifest = await fetchJson(MOJANG_VERSION_MANIFEST_URL)
	return (manifest.versions || [])
		.filter(version => version.type === 'release')
		.map(version => version.id)
}

function getVersionSelectOptions(versions) {
	return versions.reduce((options, version) => {
		options[version] = version
		return options
	}, {})
}

function getVanillaTextureOptions(files) {
	return files
		.filter(file => file.endsWith('.png'))
		.reduce((options, file) => {
			const textureName = file.replace(/\.png$/, '')
			options[file] = textureName
			return options
		}, {})
}

function updateVanillaTexturePreview(version, category, file) {
	const preview = document.getElementById(VANILLA_TEXTURE_PREVIEW_ID)
	if (!preview || !file) return
	preview.setAttribute('src', getTextureFileUrl(version, `${category}/${file}`))
	preview.setAttribute('alt', `minecraft:${category}/${file.replace(/\.png$/, '')}`)
}

async function addVanillaTexture(version, category, file) {
	const relativePath = `${category}/${file}`
	const textureName = file.replace(/\.png$/, '')
	const source = await fetchDataUrl(getTextureFileUrl(version, relativePath))
	const texture = new Texture({
		id: textureName,
		name: file,
		folder: category,
		namespace: 'minecraft',
		path: `assets/minecraft/textures/${relativePath}`,
		mode: 'bitmap',
		saved: true,
		keep_size: true,
	}).fromDataURL(source)

	texture.namespace = 'minecraft'
	texture.path = `assets/minecraft/textures/${relativePath}`
	texture.folder = category
	texture.id = textureName
	texture.name = file
	texture.saved = true
	texture.add(true)
	texture.select()
	Project.saved = false
	Blockbench.showQuickMessage(`Added minecraft:${category}/${textureName}`)
}

async function showVanillaTexturePickerDialog() {
	let versions
	try {
		Blockbench.showQuickMessage('Loading Minecraft versions...')
		versions = await getMinecraftReleaseVersions()
	} catch (error) {
		console.error('Unable to load Minecraft versions:', error)
		versions = ['26.1.2']
		Blockbench.showQuickMessage('Unable to load versions, using fallback')
	}

	new Dialog({
		id: 'iaentitymodel.pick_vanilla_texture.category',
		title: 'Add Vanilla Texture',
		form: {
			version: {
				label: 'Version',
				type: 'select',
				value: versions[0] || '26.1.2',
				options: getVersionSelectOptions(versions),
			},
			category: {
				label: 'Textures',
				type: 'select',
				value: 'block',
				options: {
					block: 'Blocks',
					item: 'Items',
					entity: 'Entities',
					particle: 'Particles',
					painting: 'Paintings',
					gui: 'GUI',
					misc: 'Misc',
				},
			},
		},
		buttons: ['Load Textures', 'Cancel'],
		confirmIndex: 0,
		cancelIndex: 1,
		async onConfirm(formData) {
			try {
				Blockbench.showStatusMessage(`Loading vanilla ${formData.category} textures...`)
				const list = await fetchJson(getListUrl(formData.version || versions[0] || '26.1.2', formData.category || 'block'))
				showVanillaTextureFileDialog(formData.version || versions[0] || '26.1.2', formData.category || 'block', list.files || [])
			} catch (error) {
				console.error('Unable to load vanilla textures:', error)
				Blockbench.showQuickMessage('Unable to load vanilla textures')
			}
		},
	}).show()
}

function showVanillaTextureFileDialog(version, category, files) {
	const options = getVanillaTextureOptions(files)
	const firstFile = Object.keys(options)[0]
	if (!Object.keys(options).length) {
		Blockbench.showQuickMessage('No vanilla textures found')
		return
	}

	const dialog = new Dialog({
		id: 'iaentitymodel.pick_vanilla_texture.file',
		title: 'Add Vanilla Texture',
		form: {
			file: {
				label: 'Texture',
				type: 'select',
				value: firstFile,
				options,
			},
		},
		lines: [
			`<div style="display:flex;align-items:center;justify-content:center;height:260px;margin:8px 0;background:repeating-conic-gradient(#2b2b2b 0% 25%, #3a3a3a 0% 50%) 50% / 16px 16px;border-radius:4px;overflow:hidden;"><img id="${VANILLA_TEXTURE_PREVIEW_ID}" style="width:224px;height:224px;image-rendering:pixelated;image-rendering:crisp-edges;object-fit:contain;" /></div>`,
			`Adds a preview texture that exports as minecraft:${category}/<texture>.`,
		],
		buttons: ['Add Texture', 'Cancel'],
		confirmIndex: 0,
		cancelIndex: 1,
		onFormChange(formData) {
			updateVanillaTexturePreview(version, category, formData.file)
		},
		async onConfirm(formData) {
			try {
				Blockbench.showStatusMessage(`Loading minecraft:${category}/${formData.file.replace(/\.png$/, '')}...`)
				await addVanillaTexture(version, category, formData.file)
			} catch (error) {
				console.error('Unable to add vanilla texture:', error)
				Blockbench.showQuickMessage('Unable to add vanilla texture')
			}
		},
	})
	dialog.show()
	updateVanillaTexturePreview(version, category, firstFile)
}

const addVanillaTextureAction = new Action('iaentitymodel_add_vanilla_texture', {
	name: 'Add Vanilla Texture',
	description: 'Add a Minecraft vanilla texture reference to the texture list',
	icon: minecraftIcon,
	category: 'textures',
	condition: () => Format.id === modelFormat.id,
	click: showVanillaTexturePickerDialog,
})

let vanillaTextureToolbarRegistered = false
function registerVanillaTextureToolbarAction() {
	if (vanillaTextureToolbarRegistered) return
	if (typeof Toolbars !== 'undefined' && Toolbars.texturelist) {
		addVanillaTextureAction.pushToolbar(Toolbars.texturelist)
		vanillaTextureToolbarRegistered = true
	}
}

export function registerFaceTintMod() {
	if (registered) return
	registered = true
	originalFaceTintCondition = BarItems.face_tint.condition
	originalFaceTintSliderCondition = BarItems.slider_face_tint.condition

	BarItems.face_tint.condition = () =>
		!Project.box_uv &&
		(Format.id === 'java_block' || Format.id === modelFormat.id) &&
		Cube.selected.length &&
		UVEditor.selected_faces[0] &&
		Cube.selected[0].faces[UVEditor.selected_faces[0]]

	BarItems.slider_face_tint.condition = () =>
		!Project.box_uv &&
		(Format.id === 'java_block' || Format.id === modelFormat.id) &&
		Cube.selected.length &&
		UVEditor.selected_faces[0] &&
		Cube.selected[0].faces[UVEditor.selected_faces[0]]

	MenuBar.addAction(addVanillaTextureAction, 'iaentitymodel')
	registerVanillaTextureToolbarAction()
	setTimeout(registerVanillaTextureToolbarAction, 0)
	bus.on(EVENTS.LIFECYCLE.LOAD, registerVanillaTextureToolbarAction)
	bus.on(EVENTS.LIFECYCLE.CLEANUP, () => {
		registered = false
		vanillaTextureToolbarRegistered = false
		BarItems.face_tint.condition = originalFaceTintCondition
		BarItems.slider_face_tint.condition = originalFaceTintSliderCondition
		addVanillaTextureAction.delete()
	})
}
