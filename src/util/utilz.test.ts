import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'

import {
	getAdvancedPlayerModelExportFolder,
	getModelExportFolder,
	getTexturesExportFolder,
} from './utilz'
;(globalThis as any).Project = { save_path: '' }
const settings = { iaentitymodel: { namespace: 'test', projectName: 'mob' } }
const layouts = [
	['method1', '', ''],
	['method2', 'resourcepack/assets', 'resourcepack/assets/test'],
	['method3', 'resourcepack/test', 'resourcepack/test'],
	['method4', 'assets', 'assets/test'],
	['method5', 'test', 'test'],
]

for (const [name, marker, resourceRoot] of layouts) {
	const projectFolder = fs.mkdtempSync(
		path.join(os.tmpdir(), `iaentity-${name}-`)
	)
	try {
		if (marker)
			fs.mkdirSync(path.join(projectFolder, marker), { recursive: true })
		;(globalThis as any).Project.save_path = path.join(
			projectFolder,
			'project.iaentitymodel'
		)

		assert.strictEqual(
			path.relative(projectFolder, getModelExportFolder(settings)),
			path.join(resourceRoot, 'models/entity/mob')
		)
		assert.strictEqual(
			path.relative(projectFolder, getTexturesExportFolder(settings)),
			path.join(resourceRoot, 'textures/entity/mob')
		)
		const advancedRoot =
			name === 'method1' ? 'resourcepack/assets/test' : resourceRoot
		assert.strictEqual(
			path.relative(
				projectFolder,
				getAdvancedPlayerModelExportFolder(settings)
			),
			path.join(advancedRoot, 'models/entity/mob')
		)
	} finally {
		fs.rmSync(projectFolder, { recursive: true, force: true })
	}
}
