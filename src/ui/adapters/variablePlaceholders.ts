declare const Interface: any

function getPanelData() {
	return Interface?.Panels?.variable_placeholders?.inside_vue?._data
}

export function getVariablePlaceholdersText() {
	return getPanelData()?.text || ''
}

export function setVariablePlaceholdersText(text: string) {
	const data = getPanelData()
	if (data) data.text = text
}

export function setVariablePlaceholdersVisible(visible: boolean) {
	const node = Interface?.Panels?.variable_placeholders?.node
	if (node) node.style.visibility = visible ? 'visible' : 'hidden'
}