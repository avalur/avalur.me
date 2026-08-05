// Язык доклада. Весь видимый текст лежит в словарях ru.js и en.js, здесь —
// только выбор языка и оповещение тех, кому надо перерисоваться.
//
// Порядок выбора: ?lang=ru в адресе (можно дать ссылку сразу на нужный язык) →
// сохранённый выбор → английский. Английский по умолчанию: доклад читается на
// Кипре, а русская версия включается одной кнопкой.

import ru from './ru.js';
import en from './en.js';

const DICTS = { en, ru };
const STORE_KEY = 'imo-talk-lang';

export const LANGS = ['en', 'ru'];

function initial() {
	const asked = new URLSearchParams(location.search).get('lang');
	if (asked && DICTS[asked]) return asked;
	try {
		const saved = localStorage.getItem(STORE_KEY);
		if (saved && DICTS[saved]) return saved;
	} catch { /* приватный режим — просто берём язык по умолчанию */ }
	return 'en';
}

let lang = initial();
const listeners = new Set();

/** Текущий словарь. Вызывать в момент отрисовки, а не сохранять в переменную. */
export function t() { return DICTS[lang]; }

export function getLang() { return lang; }

/** Заголовок вкладки и атрибут языка страницы — тоже часть перевода. */
export function applyDocLang() {
	document.documentElement.lang = lang;
	document.title = t().doc.title;
	const desc = document.querySelector('meta[name="description"]');
	if (desc) desc.setAttribute('content', t().doc.description);
}

export function onLangChange(fn) {
	listeners.add(fn);
	return () => listeners.delete(fn);
}

export function setLang(next) {
	if (!DICTS[next] || next === lang) return;
	lang = next;
	try { localStorage.setItem(STORE_KEY, next); } catch { /* см. выше */ }
	applyDocLang();
	for (const fn of listeners) fn(lang);
}

/** Переключить на другой язык (клавиша «l» и кнопка в углу). */
export function toggleLang() {
	setLang(lang === 'en' ? 'ru' : 'en');
}

/** Тексты бита: заголовок в углу, крупная подпись, заметки докладчика. */
export function beatText(beat) {
	return t().beats[beat.id] ?? {};
}
