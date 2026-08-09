import assert from 'assert'
import fs from 'fs'
import os from 'os'
import path from 'path'
import yaml from 'js-yaml'

import { getItemsAdderContentsNamespace, syncEmoteYaml } from './itemsadderYaml'

for (const projectFolder of [
	'/server/plugins/ItemsAdder/contents/test',
	'C:\\server\\plugins\\ItemsAdder\\contents\\test',
	'/server/ItemsAdder/contents/test',
	'/server/contents/test',
]) {
	assert.strictEqual(getItemsAdderContentsNamespace(projectFolder), 'test')
}

const projectFolder = fs.mkdtempSync(path.join(os.tmpdir(), 'iaentity-yaml-'))
try {
	const unrelatedFile = path.join(projectFolder, 'a-shared.yml')
	const projectFile = path.join(projectFolder, 'custom_emote_mine.yml')
	fs.writeFileSync(
		unrelatedFile,
		yaml.dump({
			info: { namespace: 'test' },
			emotes: {
				unrelated: { id: 'unrelated' },
				mine: { wrong_file: true },
			},
		})
	)
	fs.writeFileSync(
		projectFile,
		yaml.dump({
			info: { namespace: 'test' },
			emotes: {
				other_project: { id: 'other_project' },
				mine: { custom: true },
			},
		})
	)

	syncEmoteYaml(
		projectFolder,
		'test',
		'mine',
		{ mine: { name: 'mine', canPlayerMove: true } } as any,
		'static'
	)

	assert.deepStrictEqual(
		(yaml.load(fs.readFileSync(unrelatedFile, 'utf8')) as any).emotes,
		{ unrelated: { id: 'unrelated' }, mine: { wrong_file: true } }
	)
	const emotes = (yaml.load(fs.readFileSync(projectFile, 'utf8')) as any)
		.emotes
	assert.deepStrictEqual(emotes.other_project, { id: 'other_project' })
	assert.deepStrictEqual(emotes.mine, {
		custom: true,
		id: 'mine',
		can_player_move: true,
	})
} finally {
	fs.rmSync(projectFolder, { recursive: true, force: true })
}
