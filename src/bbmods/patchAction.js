import events from '../constants/events'
import { codec, format } from '../modelFormat'
import { bus } from '../util/bus'
import { CustomError } from '../util/customError'
import {tl} from "../util/intl";

const animatedJavaPlugin = Plugins.installed.find((x) => x.id === "animated_java")
if(!animatedJavaPlugin) {
	const save_aj_project = {
		icon: 'save',
		category: 'file',
		condition: () => format.id === Format.id,
		click: function () {
			saveTextures(true)
			if (isApp && Project.save_path) {
				codec.write(codec.compile(), Project.save_path)
			} else {
				codec.export()
				Project.save_path = Project.export_path
			}
		},
	}

	const save_aj_project_as = {
		icon: 'save',
		category: 'file',
		// keybind: new Keybind({ key: 83, ctrl: true, alt: true }),
		condition: () => format.id === Format.id,
		click: function () {
			saveTextures(true)
			codec.export()
		},
	}


	Action.prototype.patch = function (name) {
		;(this.patches = this.patches || []).push(name)
	}
	Action.prototype._trigger = Action.prototype.trigger
	Action.prototype.trigger = function (...args) {
		if (this.patches) {
			const defer = this.patches.find((action) => BARS.condition(action))
			if (defer) {
				return defer.click(...args)
			}
		}
		return this._trigger(...args)
	}

	bus.on(events.LIFECYCLE.CLEANUP, () => {
		if (Action.prototype.patch) {
			delete Action.prototype.patch
			Action.prototype.trigger = Action.prototype._trigger
			delete Action.prototype._trigger
			for (const i of Object.values(BarItems)) if (i.patches) delete i.patches
		}
		format.delete()
		StartScreen.vue.$forceUpdate()
	})
	BarItems['save_project'].patch(save_aj_project)
	BarItems['export_over'].patch(save_aj_project)
	BarItems['save_project_as'].patch(save_aj_project_as)
} else {
	new Dialog(
		Object.assign(
			{
				id: 'iaentitymodel.dialogs.miscError',
				title: "Error",
				lines: [
					"ItemsAdder Entity Model is not compatible with Animated Java, please uninstall it then restart Blockbench."
				],
				width: 512,
				height: 512,
				singleButton: true,
				onCancel() {
					new Dialog(
						Object.assign(
							{
								id: 'iaentitymodel.dialogs.miscError',
								title: "Error",
								lines: [
									"Now please remove Animated Java then restart Blockbench."
								],
								width: 512,
								height: 512,
								singleButton: true,
								onCancel() {
									Plugins.dialog.show()
								}
							}
						)
					).show()
				}
			}
		)
	).show()
}