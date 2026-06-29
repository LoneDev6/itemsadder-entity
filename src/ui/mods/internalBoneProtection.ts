import { bus } from '../../util/bus'
import events from '../../constants/events'
import { isInternalElement } from '../../util/utilz'

declare const OutlinerNode: any

let registered = false
let originalRemove: any = null

export function registerInternalBoneProtection() {
	if (registered) return
	registered = true
	originalRemove = OutlinerNode.prototype.remove

	OutlinerNode.prototype.remove = new Proxy(originalRemove, {
		apply(target, thisArg, argumentsList) {
			console.log('Tried to remove an element.')
			if (isInternalElement(thisArg.name)) {
				console.log('Cancelled removal of internal bone.')
				alert("You can't delete builtin entity bones.")
				throw new Error("You can't delete builtin entity bones.")
			}

			return target.call(thisArg, ...argumentsList)
		},
	})

	bus.on(events.LIFECYCLE.CLEANUP, () => {
		registered = false
		if (originalRemove) {
			OutlinerNode.prototype.remove = originalRemove
			originalRemove = null
		}
	})
}