import { tl} from '../../util/intl'
import { isCustomFormat, format as modelFormat } from '../../modelFormat'
import {isInternalModel} from "../../util/utilz";
import { settings } from '../../settings'
import { CustomError } from '../../util/customError'

// Properties registration to make Blockbench save them in the project file
new Property(Animation, 'string', 'animType', {
	default: () => undefined,
	exposed: true,
	condition: (val: any) => val !== undefined && val !== ""
})
new Property(Animation, 'string', 'canPlayerMove', {
	default: () => undefined,
	exposed: true,
	condition: (val: any) => val !== undefined && val !== ""
})

const refreshAnimIcons = () => {
	// @ts-ignore
	Animation.all.forEach(anim => {
		let icon = ""
		if(anim.animType === "idle")
			icon = `<i class="material-icons">person</i>`
		else if(anim.animType === "walk")
			icon = `<i class="material-icons">directions_run</i>`
		else if(anim.animType === "attack")
			icon = `<i class="fa fa-fist-raised"></i>`
		else if(anim.animType === "death")
			icon = `<i class="fa fa-skull-crossbones"></i>`
		else if(anim.animType === "fly")
			icon = `<i class="fa fa-dove"></i>`

		document.querySelector(`[anim_type_anim_id='${anim.uuid}']`)?.remove()
		document.querySelector(`[anim_id='${anim.uuid}']`).insertAdjacentHTML("beforeend", `<div anim_type_anim_id='${anim.uuid}' class="in_list_button unclickable">${icon}</div>`)
	})
}

const handleClick_animType = (animation, name) => {

	// Make sure only one animation has this type set
	if(name != "other") {
		// @ts-ignore
		Animation.all.forEach(anim => {
			if(anim.animType == name) {
				anim.animType = "other"
			}
		})
	}

	if(animation.animType != name)
		Project.saved = false

	animation.animType = name

	refreshAnimIcons()
}

const handleClick_canPlayerMove = (animation, val) => {

	if(animation.canPlayerMove != val) {
		Project.saved = false
		animation.canPlayerMove = val
	}
}

// @ts-ignore
Animation.prototype.menu.structure.splice(12, 0, '_')

let isInternalModel_ = () => isInternalModel(settings)

// @ts-ignore
Animation.prototype.menu.structure.splice(13, 0, {name: tl('iaentitymodel.menu.animation.animType.title'), icon: 'movie', children: [
	{name: tl('iaentitymodel.menu.animation.animType.value.other'), icon: animation => (animation.animType == 'other' ? 'radio_button_checked' : 'radio_button_unchecked'), click(animation) { handleClick_animType(animation, "other") }, condition: isCustomFormat},
	{name: tl('iaentitymodel.menu.animation.animType.value.idle'), icon: animation => (animation.animType == 'idle' ? 'radio_button_checked' : 'radio_button_unchecked'), click(animation) { handleClick_animType(animation, "idle") }, condition: isCustomFormat},
	{name: tl('iaentitymodel.menu.animation.animType.value.walk'), icon: animation => (animation.animType == 'walk' ? 'radio_button_checked' : 'radio_button_unchecked'), click(animation) { handleClick_animType(animation, "walk") }, condition: isCustomFormat},
	{name: tl('iaentitymodel.menu.animation.animType.value.attack'), icon: animation => (animation.animType == 'attack' ? 'radio_button_checked' : 'radio_button_unchecked'), click(animation) { handleClick_animType(animation, "attack") }, condition: isCustomFormat},
	{name: tl('iaentitymodel.menu.animation.animType.value.death'), icon: animation => (animation.animType == 'death' ? 'radio_button_checked' : 'radio_button_unchecked'), click(animation) { handleClick_animType(animation, "death") }, condition: isCustomFormat},
	{name: tl('iaentitymodel.menu.animation.animType.value.fly'), icon: animation => (animation.animType == 'fly' ? 'radio_button_checked' : 'radio_button_unchecked'), click(animation) { handleClick_animType(animation, "fly") }, condition: isCustomFormat},
]})
// @ts-ignore
Animation.prototype.menu.structure.splice(14, 0, {name: tl("Can Player Move"), icon: 'movie', children: [
	{name: tl("True"), icon: animation => (animation.canPlayerMove == 'true' ? 'radio_button_checked' : 'radio_button_unchecked'), click(animation) { handleClick_canPlayerMove(animation, "true") }, condition: isInternalModel_},
	{name: tl("False"), icon: animation => (animation.canPlayerMove == 'false' ? 'radio_button_checked' : 'radio_button_unchecked'), click(animation) { handleClick_canPlayerMove(animation, "false") }, condition: isInternalModel_},
]})
// @ts-ignore
Animation.prototype.menu.structure.splice(15, 0, '_')


markerColors[-1] = {pastel: '#ffffff', standard: '#ffffff', name: 'loop_start_end'}

function getLoopStartEndMarkers(animation) {
	const markers = animation?.markers
		?.filter(marker => marker.color === -1)
		.sort((a, b) => a.time - b.time)

	if (!markers || markers.length < 2 || markers[0].time === markers[1].time) return null
	return [markers[0], markers[1]]
}

let activePlaybackLoopMarkers = null
const originalTimelineStart = Timeline.start
Timeline.start = function () {
	const animation = (Animation as any).selected
	const loopMarkers = isCustomFormat() && animation?.loop === 'loop'
		? getLoopStartEndMarkers(animation)
		: null
	activePlaybackLoopMarkers = loopMarkers && Timeline.time >= loopMarkers[0].time && Timeline.time <= loopMarkers[1].time
		? loopMarkers
		: null
	return originalTimelineStart.apply(this, arguments)
}

const originalTimelineLoop = Timeline.loop
Timeline.loop = function () {
	const loopMarkers = activePlaybackLoopMarkers

	if (!loopMarkers) {
		return originalTimelineLoop.apply(this, arguments)
	}

	const timeline = Timeline as any
	const previousRange = [...timeline.custom_range]
	timeline.custom_range = [loopMarkers[0].time, loopMarkers[1].time]
	try {
		return originalTimelineLoop.apply(this, arguments)
	} finally {
		timeline.custom_range = previousRange
	}
}

// @ts-ignore
TimelineMarker.prototype.menu.structure.splice(1, 0, '_')
// @ts-ignore
TimelineMarker.prototype.menu.structure.splice(2, 0,
	{icon: 'flag', color: "#000000", name: 'Loop Start/End', click(marker) {
		// @ts-ignore
		if(Animation.selected.loop === 'loop') {
			marker.color = -1;
		} else {
			// @ts-ignore
			Blockbench.showMessageBox({
				message: tl('iaentitymodel.exporters.vanillaAnimation.dialogs.errors.markerNoLoopAnim.message'),
				icon: 'error',
			})
		}
	}, condition: isCustomFormat}
)

/*MenuBar.addAction(new Action('add_loop_marker', {
	icon: 'clock-alert',
	category: 'update',
	condition: {modes: ['animate']},
	click: function (event) {
		let count = 0;
		// @ts-ignore
		Animation.selected?.markers.forEach(marker => {
			if(marker.color === -1) {
				count++;
			}
		})
		if(count < 2) {
			// @ts-ignore
			Animation.selected?.markers.push(new TimelineMarker({time: Timeline.second, color: -1}))
		} else {
			// @ts-ignore
			Blockbench.showMessageBox({
				message: tl('iaentitymodel.exporters.vanillaAnimation.dialogs.errors.tooManyMarkers.message'),
				icon: 'error',
			})
		}
	}
}), 'animation')*/

new Action('add_loop_marker', {
	name: tl("iaentitymodel.exporters.vanillaAnimation.other.addLoopMarker"),
	icon: 'update',
	category: 'animation',
	condition: () => {
		// @ts-ignore
		return isCustomFormat() && Mode.selected?.name === 'Animate' && Animation.selected?.loop === 'loop'
	},
	click: function (event) {
		let count = 0;
		// @ts-ignore
		Animation.selected?.markers.forEach(marker => {
			if(marker.color === -1) {
				count++;
			}
		})
		if(count < 2) {
			// @ts-ignore
			Animation.selected?.markers.push(new TimelineMarker({time: Timeline.second, color: -1}))
		} else {
			// This should not happen because I already hide this button of non-loop animations
			// @ts-ignore
			/*Blockbench.showMessageBox({
				message: tl('iaentitymodel.exporters.vanillaAnimation.dialogs.errors.tooManyMarkers.message'),
				icon: 'error',
			})*/
			// @ts-ignore
			Animation.selected.markers.pop()
		}
	}
	// @ts-ignore
}).pushToolbar(Toolbars.timeline, 1)

// @ts-ignore
Blockbench.on('select_project', () => {
	queueMicrotask(() => {
		if(Format.id === modelFormat.id) {
			// Refresh animation icons
			refreshAnimIcons()
		}
	})
})