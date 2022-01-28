import type * as aj from './iaentitymodel'

import * as fs from 'fs'
import * as path from 'path'
import { tl } from './util/intl'
import { mkdir } from './util/ezfs'
import { settings } from './settings'
import { CustomError } from './util/customError'
import {  safeFunctionName } from './util/replace'
import { getModelPath } from './util/minecraft/resourcepack'
// @ts-ignore
import transparent from './assets/transparent.png'

// Exports the model.json rig files
async function exportRigModels(
	models: aj.ModelObject,
	variantModels: aj.VariantModels
) {
	console.groupCollapsed('Export Rig Models')
	const metaPath = path.join(
		settings.iaentitymodel.rigModelsExportFolder,
		'.aj_meta'
	)

	if (!fs.existsSync(metaPath)) {
		const files = fs.readdirSync(
			settings.iaentitymodel.rigModelsExportFolder
		)
		// If the meta folder is empty, just write the meta and export models. However it there are other files/folder in there, show a warning.
		if (files.length > 0) {
			await new Promise<void>((resolve, reject) => {
				let d = new Dialog({
					id: 'iaentitymodel.rigFolderHasUnknownContent',
					title: tl(
						'iaentitymodel.dialogs.errors.rigFolderHasUnknownContent.title'
					),
					lines: [
						tl(
							'iaentitymodel.dialogs.errors.rigFolderHasUnknownContent.body',
							{
								path: settings.iaentitymodel
									.rigModelsExportFolder,
								files: files.join(', '),
							}
						),
					],
					// @ts-ignore
					width: 512 + 128,
					buttons: ['Overwrite', 'Cancel'],
					confirmIndex: 0,
					cancelIndex: 1,
					onConfirm() {
						d.hide()
						Blockbench.writeFile(metaPath, {
							// @ts-ignore
							content: Project.UUID,
							custom_writer: null,
						})
						resolve()
					},
					onCancel() {
						d.hide()
						reject(
							new CustomError(
								'Rig Folder Unused -> User Cancelled Export Process',
								{ intentional: true, silent: true }
							)
						)
					},
				}).show()
			})
		} else {
			Blockbench.writeFile(metaPath, {
				// @ts-ignore
				content: Project.UUID,
				custom_writer: null,
			})
		}
		// @ts-ignore
	} else if (fs.readFileSync(metaPath, 'utf-8') !== Project.UUID) {
		const files = fs.readdirSync(
			settings.iaentitymodel.rigModelsExportFolder
		)
		await new Promise<void>((resolve, reject) => {
			let d = new Dialog({
				id: 'iaentitymodel.rigFolderAlreadyUsedByOther',
				title: tl(
					'iaentitymodel.dialogs.errors.rigFolderAlreadyUsedByOther.title'
				),
				lines: [
					tl(
						'iaentitymodel.dialogs.errors.rigFolderAlreadyUsedByOther.body',
						{
							path: settings.iaentitymodel.rigModelsExportFolder,
							files: files.join(', '),
						}
					),
				],
				// @ts-ignore
				width: 512 + 128,
				buttons: ['Overwrite', 'Cancel'],
				confirmIndex: 0,
				cancelIndex: 1,
				onConfirm() {
					d.hide()
					Blockbench.writeFile(metaPath, {
						// @ts-ignore
						content: Project.UUID,
						custom_writer: null,
					})
					resolve()
				},
				onCancel() {
					d.hide()
					reject(
						new CustomError(
							'Rig Folder Already Occupied -> User Cancelled Export Process',
							{ intentional: true, silent: true }
						)
					)
				},
			}).show()
		})
	}

	console.log('Export Models:', models)
	console.group('Details')

	for (const [name, model] of Object.entries(models)) {
		// Get the model's file path
		const modelFilePath = path.join(
			settings.iaentitymodel.rigModelsExportFolder,
			name + '.json'
		)
		console.log('Exporting Model', modelFilePath, model.elements)
		// Export the model
		const modelJSON = {
			__credit:
				'Generated using Animated Java (https://animated-java.dev/)',
			...model,
			aj: undefined,
		}
		Blockbench.writeFile(modelFilePath, {
			content: autoStringify(modelJSON),
			custom_writer: null,
		})
	}
	console.groupEnd()

	console.log('Export Variant Models:', variantModels)
	console.group('Details')

	for (const [variantName, variant] of Object.entries(variantModels)) {
		const variantFolderPath = path.join(
			settings.iaentitymodel.rigModelsExportFolder,
			variantName
		)
		// Don't export empty variants
		if (Object.entries(variant).length < 1) continue

		mkdir(variantFolderPath, { recursive: true })

		for (const [modelName, model] of Object.entries(variant)) {
			// Get the model's file path
			const modelFilePath = path.join(
				variantFolderPath,
				`${modelName}.json`
			)
			console.log('Exporting Model', modelFilePath)
			// Export the model
			const modelJSON = {
				__credit:
					'Generated using Animated Java (https://animated-java.dev/)',
				...model,
				aj: undefined,
			}
			Blockbench.writeFile(modelFilePath, {
				content: autoStringify(modelJSON),
				custom_writer: null,
			})
		}
	}
	console.groupEnd()

	console.groupEnd()
}

interface Override {
	predicate: {
		custom_model_data: number
	}
	model: string
}

interface PredicateModel {
	parent: string
	textures: {
		layer0: string
	}
	overrides: Override[]
	aj: {
		includedRigs: Record<
			string,
			{
				usedIDs: (number | [number, number])[]
				name: string
			}
		>
	}
}

function throwPredicateMergingError(reason: string) {
	throw new CustomError('Predicate Missing Overrides List', {
		intentional: true,
		dialog: {
			id: 'iaentitymodel.predicateMergeFailed',
			title: tl(
				'iaentitymodel.dialogs.errors.predicateMergeFailed.title',
				{
					reason,
				}
			),
			lines: [
				tl('iaentitymodel.dialogs.errors.predicateMergeFailed.body', {
					reason,
				}),
			],
			width: 512 + 256,
			singleButton: true,
		},
	})
}

async function exportPredicate(
	models: aj.ModelObject,
	variantModels: aj.VariantModels,
	ajSettings: aj.Settings
) {
	console.groupCollapsed('Export Predicate Model')
	const projectName = safeFunctionName(ajSettings.projectName)

	const predicateJSON = {
		parent: 'item/generated',
		textures: {
			layer0: `item/potion_overlay`,
			layer1: `item/potion`
		},
		overrides: [],
		aj: { // TODO: remove this useless stuff
			includedRigs: {},
		},
	}
	let usedIDs = []
	function* idGen() {
		let id = 1
		while (true) {
			if (!usedIDs.includes(id)) yield id
			id++
		}
	}
	if (fs.existsSync(ajSettings.predicateFilePath)) {
		const oldPredicate: PredicateModel = JSON.parse(
			await fs.promises.readFile(ajSettings.predicateFilePath, {
				encoding: 'utf-8',
			})
		)
		console.log(oldPredicate)
		// @ts-ignore
		if (oldPredicate) {
			if (!oldPredicate?.aj) {
				throwPredicateMergingError(
					tl(
						'iaentitymodel.dialogs.errors.predicateMergeFailed.reasons.ajMetaMissing'
					)
				)
			} else if (!oldPredicate.overrides) {
				throwPredicateMergingError(
					tl(
						'iaentitymodel.dialogs.errors.predicateMergeFailed.reasons.overridesMissing'
					)
				)
			}
		}
		const data = oldPredicate?.aj?.includedRigs || {}
		if (!oldPredicate?.aj?.includedRigs) {
			data.preExistingIds = {
				name: 'preExistingIds',
				usedIDs: packArr(
					oldPredicate.overrides.map((override) => {
						usedIDs.push(override.predicate.custom_model_data)
						return override.predicate.custom_model_data
					})
				),
			}
		} else {
			Object.entries(data).forEach(([id, dat]) => {
				let ids = dat.usedIDs
				// @ts-ignore
				if (id !== Project.UUID) {
					for (let i = 0; i < ids.length; i++) {
						if (Array.isArray(ids[i])) {
							for (let k = ids[i][0]; k <= ids[i][1]; k++) {
								usedIDs.push(k)
							}
						} else {
							usedIDs.push(ids[i])
						}
					}
				}
			})
		}
		// @ts-ignore
		delete data[Project.UUID]
		predicateJSON.aj.includedRigs = data
		predicateJSON.overrides = oldPredicate.overrides.filter((override) => {
			return usedIDs.includes(override.predicate.custom_model_data)
		})
	}
	const idGenerator = idGen()
	let myMeta = []
	for (const [modelName, model] of Object.entries(models)) {
		// this will always be a number as the generator is infinite.
		model.aj.customModelData = idGenerator.next().value as number
		predicateJSON.overrides.push({
			predicate: { custom_model_data: model.aj.customModelData },
			model: getModelPath(
				path.join(ajSettings.rigModelsExportFolder, modelName),
				modelName
			),
		})
		myMeta.push(model.aj.customModelData)
	}

	for (const [variantName, variant] of Object.entries(variantModels))
		for (const [modelName, model] of Object.entries(variant)) {
			model.aj.customModelData = idGenerator.next().value as number
			myMeta.push(model.aj.customModelData)
			predicateJSON.overrides.push({
				predicate: { custom_model_data: model.aj.customModelData },
				model: getModelPath(
					path.join(
						ajSettings.rigModelsExportFolder,
						variantName,
						modelName
					),
					modelName
				),
			})
		}

	//@ts-ignore
	predicateJSON.aj.includedRigs[Project.UUID] = {
		name: settings.iaentitymodel.projectName,
		usedIDs: packArr(myMeta),
	}
	Blockbench.writeFile(ajSettings.predicateFilePath, {
		content: autoStringify(predicateJSON),
		custom_writer: null,
	})
	console.groupEnd()
}
function packArr(arr) {
	//take an array of numbers and return an array of ranges of consecutive numbers and if a number is not consecutive it is put in its the resulting array
	let result = []
	let currentRange = [arr[0]]
	for (let i = 1; i < arr.length; i++) {
		if (arr[i] - arr[i - 1] === 1) {
			currentRange.push(arr[i])
		} else {
			result.push(currentRange)
			currentRange = [arr[i]]
		}
	}
	result.push(currentRange)
	return result.map((range) => {
		if (range.length === 1) {
			return range[0]
		} else {
			return [range[0], range[range.length - 1]]
		}
	})
}
async function exportTransparentTexture() {
	console.log(transparent)
	Blockbench.writeFile(settings.iaentitymodel.transparentTexturePath, {
		content: Buffer.from(
			String(transparent).replace('data:image/png;base64,', ''),
			'base64'
		),
		custom_writer: null,
	})
}

export { exportRigModels, exportPredicate, exportTransparentTexture }
