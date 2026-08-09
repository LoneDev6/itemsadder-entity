import type * as aj from '../iaentitymodel'

import fs from 'fs'
import path from 'path'
import yaml from 'js-yaml'

const ITEMSADDER_CONTENTS_LAYOUTS = [
	/(?:^|[\/])plugins[\/]ItemsAdder[\/]contents[\/]([^\/]+)/i,
	/(?:^|[\/])ItemsAdder[\/]contents[\/]([^\/]+)/i,
	/(?:^|[\/])contents[\/]([^\/]+)/i,
]

export function getItemsAdderContentsNamespace(projectFolder: string) {
	projectFolder = projectFolder.replace(/\\/g, '/')
	for (const layout of ITEMSADDER_CONTENTS_LAYOUTS) {
		const contentsFolderMatch = projectFolder.match(layout)
		if (contentsFolderMatch?.[1]) return contentsFolderMatch[1]
	}
	return undefined
}

export function validateItemsAdderContentsFolder(projectFolder: string, projectNamespace: string) {
	const folderNamespace = getItemsAdderContentsNamespace(projectFolder)
	if (!folderNamespace) {
		return {
			valid: false,
			message: "Save the project into an ItemsAdder contents folder before exporting! Supported examples: 'plugins/ItemsAdder/contents/test/project.iaentitymodel', 'ItemsAdder/contents/test/project.iaentitymodel', or 'contents/test/project.iaentitymodel'",
			logMessage: `Not in contents folder. ${projectFolder}`,
		}
	}
	if (folderNamespace !== projectNamespace) {
		return {
			valid: false,
			message: "Wrong namespace. The project namespace is '" + projectNamespace + "' but the ItemsAdder folder namespace is '" + folderNamespace + "'!",
		}
	}
	return { valid: true, folderNamespace }
}

export function getAllYmlFiles(dir: string): string[] {
	let results: string[] = []
	const list = fs.readdirSync(dir)
	list.forEach(function (file) {
		const filePath = path.join(dir, file)
		const stat = fs.statSync(filePath)
		if (stat && stat.isDirectory()) {
			results = results.concat(getAllYmlFiles(filePath))
		} else if (file.endsWith('.yml')) {
			results.push(filePath)
		}
	})
	return results
}

function readYamlFile(file: string) {
	const fileContent = fs.readFileSync(file, 'utf8')
	try {
		return yaml.load(fileContent) as any
	} catch (e) {
		console.warn(`Failed to parse YAML file: ${file}`, e)
		return undefined
	}
}

function writeYamlFile(file: string, data: any) {
	fs.writeFileSync(file, yaml.dump(data), 'utf8')
}

export function ensureCustomEntityYaml(projectFolder: string, namespace: string, projectName: string) {
	const files = getAllYmlFiles(projectFolder)
	for (const file of files) {
		const ymlData = readYamlFile(file)
		if (ymlData?.info?.namespace !== namespace) continue

		console.log(`File ${file} contains the correct namespace: ${namespace}`)
		if (ymlData.entities?.[projectName]) {
			console.log(`File ${file} contains the custom entity: ${projectName}`)
			return
		}
	}

	const ymlFile = path.join(projectFolder, `custom_entity_${projectName}.yml`)
	const ymlData = {
		info: {
			namespace,
		},
		entities: {
			[projectName]: {
				model_folder: `entity/${projectName}`,
				type: 'ZOMBIE',
				can_sun_burn: false,
			},
		},
	}

	writeYamlFile(ymlFile, ymlData)
	console.log(`Created new YML file: ${ymlFile}`)
}

export function syncEmoteYaml(
	projectFolder: string,
	namespace: string,
	projectName: string,
	animations: aj.Animations,
	staticAnimationUuid: string
) {
	const files = getAllYmlFiles(projectFolder)
	const projectYmlFile = path.join(projectFolder, `custom_emote_${projectName}.yml`)
	const emoteNames = new Set(
		Object.entries(animations)
			.filter(([key, animation]) => key !== staticAnimationUuid && animation && typeof animation.name === 'string')
			.map(([, animation]) => animation.name)
	)
	const projectFileIndex = files.indexOf(projectYmlFile)
	if (projectFileIndex >= 0) files.unshift(...files.splice(projectFileIndex, 1))
	let yamlData: any = undefined
	let ymlFile: string | undefined = undefined

	for (const file of files) {
		const currentYamlData = readYamlFile(file)
		if (currentYamlData?.info?.namespace !== namespace) continue

		console.log(`File ${file} contains the correct namespace: ${namespace}`)
		if (!currentYamlData.emotes) continue
		if (file !== projectYmlFile && !Object.keys(currentYamlData.emotes).some((name) => emoteNames.has(name))) continue

		yamlData = currentYamlData
		ymlFile = file
		console.log(`File ${file} contains the emote: ${projectName}`)
		break
	}

	if (!yamlData) {
		ymlFile = projectYmlFile
		yamlData = {
			info: {
				namespace,
			},
			emotes: {},
		}
	}

	for (const [key, animation] of Object.entries(animations)) {
		if (key === staticAnimationUuid) continue
		if (!animation || typeof animation.name !== 'string') continue

		yamlData.emotes[animation.name] = {
			...(yamlData.emotes[animation.name] || {}),
			id: animation.name,
			can_player_move: Boolean(animation.canPlayerMove),
		}
	}

	writeYamlFile(ymlFile, yamlData)
	console.log(`Created new YML file: ${ymlFile}`)
}
