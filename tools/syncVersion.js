import fs from 'fs'

const PACKAGE_JSON_PATH = './package.json'
const ENV_YAML_PATH = './env.yaml'

export function syncVersionFromPackage() {
	const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'))
	const version = packageJson.version

	if (!version) {
		throw new Error('package.json version is not defined')
	}

	const envYaml = fs.readFileSync(ENV_YAML_PATH, 'utf-8')
	if (!/^PLUGIN_VERSION:\s*['"]?[^'"\n]+['"]?/m.test(envYaml)) {
		throw new Error('PLUGIN_VERSION was not found in env.yaml')
	}

	const nextEnvYaml = envYaml.replace(
		/^PLUGIN_VERSION:\s*['"]?[^'"\n]+['"]?/m,
		`PLUGIN_VERSION: '${version}'`
	)

	if (nextEnvYaml !== envYaml) {
		fs.writeFileSync(ENV_YAML_PATH, nextEnvYaml, 'utf-8')
	}

	return version
}
