declare const Blockbench: any

const INVALID_CUBE_NOTIFICATION_KEY = 'invalidCubeNotification'

export function showInvalidCubeNotification(text: string) {
	if ((globalThis as any)[INVALID_CUBE_NOTIFICATION_KEY]) return
	;(globalThis as any)[INVALID_CUBE_NOTIFICATION_KEY] = Blockbench.showToastNotification({ text })
}

export function clearInvalidCubeNotification() {
	;(globalThis as any)[INVALID_CUBE_NOTIFICATION_KEY]?.delete()
	delete (globalThis as any)[INVALID_CUBE_NOTIFICATION_KEY]
}