const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..', '..')
const fixturesRoot = path.join(root, 'test-fixtures')
const goldenRoot = path.join(fixturesRoot, 'golden')
const actualRoot = path.join(fixturesRoot, 'actual')

function walk(dir) {
	if (!fs.existsSync(dir)) return []
	return fs.readdirSync(dir).flatMap((entry) => {
		const fullPath = path.join(dir, entry)
		const stat = fs.statSync(fullPath)
		return stat.isDirectory() ? walk(fullPath) : [fullPath]
	})
}

function relativeFiles(dir) {
	return walk(dir)
		.filter((file) => path.basename(file) !== '.gitkeep')
		.map((file) => path.relative(dir, file).replace(/\\/g, '/'))
		.sort()
}

const fixtureNames = fs.readdirSync(goldenRoot).filter((entry) => {
	return fs.statSync(path.join(goldenRoot, entry)).isDirectory()
})

let failures = 0
let checked = 0

for (const fixtureName of fixtureNames) {
	const goldenDir = path.join(goldenRoot, fixtureName)
	const actualDir = path.join(actualRoot, fixtureName)
	const goldenFiles = relativeFiles(goldenDir)
	const actualFiles = relativeFiles(actualDir)

	if (goldenFiles.length === 0) {
		console.log(`[skip] ${fixtureName}: no reviewed golden files`)
		continue
	}

	checked++
	const allFiles = Array.from(new Set([...goldenFiles, ...actualFiles])).sort()
	for (const file of allFiles) {
		const goldenFile = path.join(goldenDir, file)
		const actualFile = path.join(actualDir, file)
		if (!fs.existsSync(goldenFile)) {
			console.error(`[extra] ${fixtureName}/${file}`)
			failures++
			continue
		}
		if (!fs.existsSync(actualFile)) {
			console.error(`[missing] ${fixtureName}/${file}`)
			failures++
			continue
		}
		const golden = fs.readFileSync(goldenFile)
		const actual = fs.readFileSync(actualFile)
		if (!golden.equals(actual)) {
			console.error(`[diff] ${fixtureName}/${file}`)
			failures++
		}
	}
}

if (checked === 0) {
	console.log('No reviewed golden fixtures yet.')
}

if (failures > 0) {
	process.exitCode = 1
}