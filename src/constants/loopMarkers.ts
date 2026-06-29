export const LOOP_MARKER_NAME = 'IAENTITY_LOOP_START_END'
export const LOOP_MARKER_COLOR = -1

export function isLoopMarker(marker: any) {
	return marker?.name === LOOP_MARKER_NAME || marker?.color === -1
}
