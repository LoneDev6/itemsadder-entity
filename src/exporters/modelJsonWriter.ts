import * as path from 'path'
import type * as aj from '../iaentitymodel'
import { mkdir } from '../util/ezfs'
import { getCorrectInternalElementName, isInternalElement, toJson } from '../util/utilz'
import { DEFAULT_SCALE_MODEL_KEY } from '../constants/compat'

declare const Blockbench: any
declare function autoStringify(obj: any): string

function toExportJson(model: any) {
	return {
		...model,
		aj: undefined,
	}
}

export function hasExportableElements(model: any) {
	return !(!model.elements || model.elements.length == 0 || (model.elements.length == 1 && JSON.stringify(model.elements[0]) === '{}'))
}

export function writeBaseModel(modelExportFolder: string, name: string, model: any) {
	const modelFilePath = path.join(modelExportFolder, name + '.json')
	console.log('Exporting Model', modelFilePath, model.elements)
	Blockbench.writeFile(modelFilePath, {
		content: toJson(toExportJson(model)),
		custom_writer: null,
	})
}

export function writeScaleModel(
	modelExportFolder: string,
	models: aj.ModelObject,
	modelName: string,
	scale: string,
	model: any
) {
	if (scale === DEFAULT_SCALE_MODEL_KEY) return
	if (!isInternalElement(modelName) && scale === '0-0-0') return

	const baseModel = models[modelName]
	if (!hasExportableElements(baseModel)) return

	if (isInternalElement(modelName)) {
		model.parent = getCorrectInternalElementName(modelName)
		delete model.display.head
		model.display['thirdperson_righthand'] = {
			scale: [0, 0, 0],
		}
	}

	const modelFilePath = path.join(modelExportFolder, `${modelName}_${scale}.json`)
	console.log('Exporting Model', scale, modelFilePath)
	Blockbench.writeFile(modelFilePath, {
		content: autoStringify(toExportJson(model)),
		custom_writer: null,
	})
}

export function writeVariantModels(modelExportFolder: string, variantModels: aj.VariantModels) {
	for (const [variantName, variant] of Object.entries(variantModels)) {
		const variantFolderPath = path.join(modelExportFolder, variantName)
		if (Object.entries(variant).length < 1) continue

		mkdir(variantFolderPath, { recursive: true })

		for (const [modelName, model] of Object.entries(variant)) {
			const modelFilePath = path.join(variantFolderPath, `${modelName}.json`)
			console.log('Exporting Model', modelFilePath)
			Blockbench.writeFile(modelFilePath, {
				content: toJson(toExportJson(model)),
				custom_writer: null,
			})
		}
	}
}