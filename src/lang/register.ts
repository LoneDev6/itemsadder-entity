import { intl } from '../util/intl'

// @ts-ignore
import lang_cz from './cz.yaml'
// @ts-ignore
import lang_de from './de.yaml'
// @ts-ignore
import lang_en from './en.yaml'
// @ts-ignore
import lang_es from './es.yaml'
// @ts-ignore
import lang_fr from './fr.yaml'
// @ts-ignore
import lang_it from './it.yaml'
// @ts-ignore
import lang_ja from './ja.yaml'
// @ts-ignore
import lang_nl from './nl.yaml'
// @ts-ignore
import lang_pl from './pl.yaml'
// @ts-ignore
import lang_pt from './pt.yaml'
// @ts-ignore
import lang_ru from './ru.yaml'
// @ts-ignore
import lang_sv from './sv.yaml'
// @ts-ignore
import lang_zh from './zh.yaml'
// @ts-ignore
import lang_zh_tw from './zh_tw.yaml'

export function registerLanguages() {
	intl.register('cz', lang_cz)
	intl.register('de', lang_de)
	intl.register('en', lang_en)
	intl.register('es', lang_es)
	intl.register('fr', lang_fr)
	intl.register('it', lang_it)
	intl.register('ja', lang_ja)
	intl.register('nl', lang_nl)
	intl.register('pl', lang_pl)
	intl.register('pt', lang_pt)
	intl.register('ru', lang_ru)
	intl.register('sv', lang_sv)
	intl.register('zh', lang_zh)
	intl.register('zh_tw', lang_zh_tw)
}