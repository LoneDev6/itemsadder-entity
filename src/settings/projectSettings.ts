import { DefaultSettings, settings, settingsByUUID } from '../settings'

declare const Project: any

function migrateProjectSettings(projectSettings: any) {
	const iaSettings = projectSettings?.iaentitymodel
	if (!iaSettings) {
		return projectSettings
	}

	const legacyKeys = ['allowAdditionalModels', 'additionalModels']
	for (const legacyKey of legacyKeys) {
		const hasLegacyKey = Object.prototype.hasOwnProperty.call(iaSettings, legacyKey)
		if (!Object.prototype.hasOwnProperty.call(iaSettings, 'addsAdditionalModels') && hasLegacyKey) {
			iaSettings.addsAdditionalModels = iaSettings[legacyKey]
		}
		delete iaSettings[legacyKey]
	}
	return projectSettings
}

export function getProjectSettingsSnapshot() {
	return settings.toObject('project')
}

export function applyProjectSettings(projectSettings: any) {
	if (projectSettings) {
		settings.update(migrateProjectSettings(projectSettings))
	} else {
		resetProjectSettings()
	}
}

export function resetProjectSettings() {
	settings.update(DefaultSettings, true)
}

export function rememberCurrentProjectSettings() {
	if (Project?.uuid) {
		settingsByUUID.set(Project.uuid, settings.toObject())
	}
}