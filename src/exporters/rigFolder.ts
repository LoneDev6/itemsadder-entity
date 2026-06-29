import * as fs from 'fs'
import * as path from 'path'
import { tl } from '../util/intl'
import { CustomError } from '../util/customError'

declare const Dialog: any
declare const Blockbench: any
declare const Project: any
declare function guid(): string

function writeRigFolderUuid(metaPath: string) {
	Blockbench.writeFile(metaPath, {
		content: Project.UUID,
		custom_writer: null,
	})
}

function confirmRigFolderOwnership(
	modelExportFolder: string,
	metaPath: string,
	files: string[],
	dialogId: string,
	titleKey: string,
	bodyKey: string,
	errorMessage: string
) {
	return new Promise<void>((resolve, reject) => {
		let dialog = new Dialog({
			id: dialogId,
			title: tl(titleKey),
			lines: [
				tl(bodyKey, {
					path: modelExportFolder,
					files: files.join(', '),
				}),
			],
			width: 512 + 128,
			buttons: ['Overwrite', 'Cancel'],
			confirmIndex: 0,
			cancelIndex: 1,
			onConfirm() {
				dialog.hide()
				writeRigFolderUuid(metaPath)
				resolve()
			},
			onCancel() {
				dialog.hide()
				reject(new CustomError(errorMessage, { intentional: true, silent: true }))
			},
		}).show()
	})
}

export async function ensureRigFolderOwnership(modelExportFolder: string) {
	const metaPath = path.join(modelExportFolder, '.uuid')

	if (Project.UUID === undefined) {
		Project.UUID = guid()
	}

	if (!fs.existsSync(metaPath)) {
		const files = fs.readdirSync(modelExportFolder)
		if (files.length > 0) {
			await confirmRigFolderOwnership(
				modelExportFolder,
				metaPath,
				files,
				'iaentitymodel.rigFolderHasUnknownContent',
				'iaentitymodel.dialogs.errors.rigFolderHasUnknownContent.title',
				'iaentitymodel.dialogs.errors.rigFolderHasUnknownContent.body',
				'Rig Folder Unused -> User Cancelled Export Process'
			)
		} else {
			writeRigFolderUuid(metaPath)
		}
		return
	}

	if (fs.readFileSync(metaPath, 'utf-8') !== Project.UUID) {
		const files = fs.readdirSync(modelExportFolder)
		await confirmRigFolderOwnership(
			modelExportFolder,
			metaPath,
			files,
			'iaentitymodel.rigFolderAlreadyUsedByOther',
			'iaentitymodel.dialogs.errors.rigFolderAlreadyUsedByOther.title',
			'iaentitymodel.dialogs.errors.rigFolderAlreadyUsedByOther.body',
			'Rig Folder Already Occupied -> User Cancelled Export Process'
		)
	}
}