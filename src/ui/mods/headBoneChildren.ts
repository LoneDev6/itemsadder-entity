declare const Group: any
declare const Cube: any
declare const Canvas: any
declare const Project: any

function createHeadContentGroup(headBone: any) {
	const groupOptions: any = { name: `${headBone.name}_content` }
	if (Array.isArray(headBone.origin)) {
		groupOptions.origin = [...headBone.origin]
	}

	const contentGroup = new Group(groupOptions).init().addTo(headBone)
	contentGroup.createUniqueName?.()
	return contentGroup
}

export function normalizeHeadBoneCubes(headBone: any) {
	if (!(headBone instanceof Group) || headBone.boneType !== 'head') return false

	const directCubes = headBone.children.filter((child: any) => child instanceof Cube)
	if (!directCubes.length) return false

	const contentGroup = headBone.children.find((child: any) => child instanceof Group && child.name === `${headBone.name}_content`)
		|| headBone.children.find((child: any) => child instanceof Group && !child.boneType)
		|| createHeadContentGroup(headBone)

	directCubes.forEach((cube: any) => cube.addTo(contentGroup))
	headBone.openUp?.()
	contentGroup.openUp?.()
	return true
}

export function normalizeAllHeadBoneCubes() {
	let changed = false
	for (const group of Group.all) {
		changed = normalizeHeadBoneCubes(group) || changed
	}

	if (changed) {
		Canvas.updateAll()
		if (Project) Project.saved = false
	}

	return changed
}