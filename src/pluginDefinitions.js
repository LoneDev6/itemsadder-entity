import { format } from './modelFormat'
import { bus } from './util/bus'

Plugin.register('iaentitymodel', {
	name: 'iaentitymodel',
	title: 'ItemsAdder Entity',
	author: 'LoneDev',
	description: process.env.PLUGIN_DESCRIPTION,
	icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABwAAAAcCAYAAAByDd+UAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAATeSURBVEhL7ZVPbBRVHMd/772Z2WV320JboEBZDBhFQmI0EaMmarh44eCFeiDxQJCDJCQePQGJB6M9eNPEcPBmxHjyogcT78Z/iSBQ2tLuLttuW+hOd2d25r338zvTKewgYBP1xjf55b359/vM9/d+b4Ye67+WyMZN6+29Hx2Qgs4IQYuW3M++uPnenezSprRZoDhZnTwqBJ8lIY5JSJDEw8IXUn0uWHzy6Y0z89m9j9Qjgad3nSvZwuAJTM8KKQ9L2BKkKBmlSIAynQshYxx/Ka2dnLz2zu/rTz9YDwSe3v9h1bDzLhKeQqKRJPl63IP1B4DpeYESKFLfSVd+fOHnt37I0uWUA56ofvB8URbfR4I3lVQO0mRJAUqKmAIlqQyUhrw3T89nx7jzJ6nUZLXa+Xri0oTJEHng0W2nLlYKQydHijup5FRI9SVLYBsJVfoC/SNC9r0M5gPlEg2VK1RUpQPHvnl6OkPAQp8sohP7VFuboUbnJoU6IEe65CqXPMT66JHnuFRwvPXAcdEpYF6gcnELjY2O0pN799LYyCh7nstEvfXkmXJAFw8p4aTNEOguwLM8uzpFftROHSTAu9AUDKDrwU2FxnfuoP3j4zQ8NERCCrbWkjGWwiz3hnLAoiwZTxW1ko7FOsKwoNAEXPfn6OryFVoOltKSpVC43DYwSPt27abqrrG0hAwBYq0xbLRJBt3r5ZE5YEEWo4LcEniy0HWE28MaRYBqy2Qi0+Nae45+XfiFutanJ3bv4bHRESp4LoGRgAxCIyKwQkwCrXVoIjzdp/tLGrjCbbvCawO4ijbx0QJddHzIxD0Y0DEyBHDtSMnGsgYrsgAA1AXRh7O2RsTG+tpoX7qoa59yQE+4vqPcRThroSuXsLHSkCxWcLkN6BqgIQLvzSGK14WvNmAriCXAl+BsWWu7BHAL8xZbdXdLJMoBHZIrgM2jrWtwVcflBhamadg2AbmFWLCcJDarSL4C4AJc3gIc121TW9OEywaqW9dW1zCv6SDQWfpUOSA2Ugvfi2liSmIGSzeLdZ/WpJOxhmgACIBtImnTGsCsrSPxHBzOosYzyQhnM7HWM3iBaTTBI4CsFtDT17XQV0PbuRLE/pXYRlPGxrOakJRNHdAUyEwY4cZYOLE30ZE34PQqXvoysf0T63fd6HiKXB1n2VOpbEz17MhRt6tXg9Vgebmnw7Ym2yE2AcoakkjWLtlW3Bspj4bjW/fctoZa6NAl9GEL/YQ1s4uGeVGgxMSiyZZanbA0+33t4l2XOYdrUbO2YFqXe7o7E7GtKzjAnXUruIYSzsPdepDBscXczMPtPGO94tjW0a0NNEsDaeekx9eEEr+133gp96m572/B4jhNyEUquTRERSvFgEPOIAtTkcIp4fYKOnXgme2Hyi/veyVkwWtkuGM57hLLjhHxmrGF9pAJO3+0WhFdPq4vkMhti4f9D8U5OofFIMcfnipqUahELPDNSsBu6eDwodKL1SORQ6qDfd6NFPvYKD6tDXQbFT86/+PrJvlzQrlNn+hhwA2l4G/plqpsx4eWOhXD7uDhrQfLL1SP9ETM+OMDRBSWd7TiiUvH088h9DfQhv4JuCHcx/QanVfezhuFp7YdKj43/Go0f6fRy8qWAB4K+ZdK1vkrBedJw232hR/r/xLRX/mu8GjfqVFcAAAAAElFTkSuQmCC',
	version: process.env.PLUGIN_VERSION,
	min_version: '5.0.0',
	variant: 'desktop',
	tags: ['Minecraft: Java Edition', 'Animation', 'ItemsAdder', 'Spigot', 'Armor Stand'],
	format,
	onload: function onload(event) {
		bus.dispatch('plugin:load', {})
	},
	onunload: function onunload(event) {
		bus.dispatch('plugin:unload', {})
	},
	oninstall: function oninstall() {
		bus.dispatch('plugin:install', {})
	},
	onuninstall: function onuninstall() {
		bus.dispatch('plugin:uninstall', {})
	},
})
