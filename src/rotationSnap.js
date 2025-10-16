import EVENTS from './constants/events'
import { format } from './modelFormat'
import { bus } from './util/bus'

import { settings } from './settings'
import { isJavaCubeOutOfBoundsAdjustScale } from './modelComputation'

function createBox() {
	const size = settings.iaentitymodel.modelScalingMode === '3x3x3' ? 1.88 : 7.5
	const a = new THREE.BoxGeometry(16 * size, 16 * size, 16 * size)
	const b = new THREE.EdgesGeometry(a)
	const c = new THREE.LineSegments(
		b,
		new THREE.LineBasicMaterial({ color: 0x1f6e18 })
	)
	c.position.y = settings.iaentitymodel.modelScalingMode === '3x3x3' ? 2 : 7.5
	console.log(c)
	return c
}

global.visboxs = []
let last = null
let last_mult = null
let Selected = null
let mode
let $originalCanvasHideGizmos = Canvas.withoutGizmos
bus.on(EVENTS.LIFECYCLE.CLEANUP, () => {
	Canvas.withoutGizmos = $originalCanvasHideGizmos
	global.visboxs.forEach((box) => {
		if (box?.parent) box.parent.remove(box)
	})
	global.visboxs = []
})
bus.on(EVENTS.LIFECYCLE.LOAD, () => {
	Canvas.withoutGizmos = (...args) => {
		global.visboxs.forEach((v) => (v.visible = false))
		$originalCanvasHideGizmos.apply(Canvas, args)
		global.visboxs.forEach((v) => (v.visible = true))
	}
})

settings.watch('iaentitymodel.modelScalingMode', () => {
	if (Selected) {
		global.visboxs = []
		for (let item of Selected) {
			if (item.visbox) {
				item.mesh.remove(item.visbox)
				item.visbox = createBox()
				item.mesh.add(item.visbox)
				global.visboxs.push(item.visbox)
			}
		}
	}
})

let prevCube;
Blockbench.on('update_selection', () => {
	if (format.id === Format.id) {
		if (Group.selected || Mode.selected.name === 'Animate') {
			Format.rotation_limit = false
		} else {
			Format.rotation_limit = true
		}


		if(prevCube != Cube.selected[0]) {
			global.invalidCubeNotification?.delete();
			delete global.invalidCubeNotification;
		}

		if(Cube.selected.length == 1) {
			isJavaCubeOutOfBoundsAdjustScale(Cube.selected[0])
		}
		prevCube = Cube.selected[0];
	}
})

bus.on(EVENTS.LIFECYCLE.LOAD, () => {
	const frame = () => {
		if (format.id === Format.id) {
			//const viewmode = settings.iaentitymodel.boundingBoxRenderMode
			const viewmode = "single"
			if (viewmode !== mode) {
				mode = viewmode
				global.visboxs.forEach((v) => v.parent.remove(v))
				Array.from(last_mult || []).forEach((item) => {
					if (item.visbox) {
						item.mesh.remove(item.visbox)
						//console.log(`remove ${item.name}`)
						delete item.visbox
					}
				})
				global.visboxs = []
				last = null
				last_mult = null
				Selected = null
			}
			if (Mode.selected.id === 'edit' && viewmode !== 'none') {
				let parent = null
				let selectedGroup = Project.selected_groups?.[0]
				if (selectedGroup && selectedGroup.name !== 'SCENE') {
					parent = Project.selected_groups?.[0]
				} else if (Cube.selected.length) {
					if (Cube.selected[0].parent !== 'root')
						parent = Cube.selected[0].parent
				}
				if (parent !== last) {
					if (global.visboxs.length) {
						try {
							global.visboxs.forEach((v) => v.parent.remove(v))
						} catch (e) {}
						global.visboxs = []
					}
					if (parent && parent.name !== 'SCENE') {
						const b = createBox()
						parent.mesh.add(b)
						global.visboxs.push(b)
					}
					last = parent
				}
			} else if (last || last_mult) {
				global.visboxs.forEach((v) => v.parent.remove(v))
				Array.from(last_mult || []).forEach((item) => {
					if (item.visbox) {
						item.mesh.remove(item.visbox)
						//console.log(`remove ${item.name}`)
						delete item.visbox
					}
				})
				global.visboxs = []
				last = null
				last_mult = null
				Selected = null
			}
		}
		requestAnimationFrame(frame)
	}
	requestAnimationFrame(frame)
	bus.on(EVENTS.LIFECYCLE.CLEANUP, () => {
		cancelAnimationFrame(frame)
	})
})
