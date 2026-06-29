// Compatibility contract with the ItemsAdder Java loader. Do not rename these casually.
export const INTERNAL_PLAYER_BONE_NAMES = [
	'parm_left_3',
	'parm_right_4',
	'pbody_2',
	'phead_0',
	'pleg_left_1',
	'pleg_right_5',
	'sus_6',
] as const

export const REQUIRED_INTERNAL_PLAYER_BONE_NAMES = INTERNAL_PLAYER_BONE_NAMES.filter((name) => name !== 'sus_6')

export const INTERNAL_PLAYER_BONE_NAME_SET = new Set<string>(INTERNAL_PLAYER_BONE_NAMES)

export function hasInternalPlayerSkeleton(groups: Array<{ name?: string }>) {
	const groupNames = new Set(groups.map((group) => group.name).filter(Boolean))
	return REQUIRED_INTERNAL_PLAYER_BONE_NAMES.every((name) => groupNames.has(name))
}

export const INTERNAL_PLAYER_SUS_BONE_UUID = '77440795-2e48-1bbd-3fee-ed8401fb4688'

export const BUILTIN_PLAYER_TEXTURE_UUID = 'e10a3209-9ffd-9d01-d2d9-0dd09446ec62'