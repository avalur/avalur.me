// Minimal on-screen furniture: beat title, counter, speaker notes, help, a
// language switch and a dev readout. Everything is hidden by default except the
// title, the counter and the language switch.
//
// Весь текст берётся из словаря текущего языка (i18n/): HUD ничего не хранит,
// поэтому relocalize() — это просто повторная отрисовка того же состояния.

import { t, beatText, getLang, setLang, LANGS } from './i18n/index.js';

/**
 * Заголовок в углу экрана. У слайдов со своим заголовком он только дублирует
 * текст на доске — такие биты помечены `hudTitle: false` и остаются без него.
 */
export function hudTitle(beat) {
	return beat.hudTitle === false ? '' : (beatText(beat).title ?? beat.id);
}

export class Hud {
	constructor(root, { dev = false } = {}) {
		this.root = root;
		root.innerHTML = `
			<div class="hud-top">
				<span class="hud-name"></span>
			</div>
			<div class="hud-caption"></div>
			<div class="hud-lang"></div>
			<div class="hud-counter"></div>
			<div class="hud-notes"></div>
			<div class="hud-help"></div>
			<div class="hud-dev"></div>
			<div class="hud-flash"></div>`;

		this.name = root.querySelector('.hud-name');
		this.caption = root.querySelector('.hud-caption');
		this.lang = root.querySelector('.hud-lang');
		this.counter = root.querySelector('.hud-counter');
		this.notes = root.querySelector('.hud-notes');
		this.help = root.querySelector('.hud-help');
		this.dev = root.querySelector('.hud-dev');
		this.flashEl = root.querySelector('.hud-flash');
		this.dev.classList.toggle('on', dev);
		this.notesVisible = false;
		this.beat = null;

		this.renderHelp();
		this.renderLang();
		// Кнопки языка — единственное место HUD, которому нужна мышь; сам #hud
		// прозрачен для неё, чтобы клик по кадру листал доклад (см. styles.css).
		this.lang.addEventListener('click', (e) => {
			const code = e.target.closest('[data-lang]')?.dataset.lang;
			if (code) setLang(code);
		});
	}

	renderHelp() {
		const helpOn = this.help.classList.contains('on');
		this.help.innerHTML = `
			<h3>${t().ui.helpTitle}</h3>
			<table>${t().ui.help.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>`;
		this.help.classList.toggle('on', helpOn);
	}

	renderLang() {
		const active = getLang();
		this.lang.innerHTML = LANGS
			.map((code) => `<button type="button" data-lang="${code}"${
				code === active ? ' class="on"' : ''}>${code.toUpperCase()}</button>`)
			.join('');
	}

	/**
	 * @param {boolean} deferCaption не менять подпись сейчас — её поставит
	 *   setCaption(), когда у бита начнётся анимация (см. `captionWith` в beats.js)
	 */
	setBeat(beat, i, total, { deferCaption = false } = {}) {
		// Запоминаем состояние: при смене языка его надо отрисовать заново.
		this.beat = beat;
		this.beatIndex = i;
		this.beatTotal = total;
		this.deferred = deferCaption;

		const text = beatText(beat);
		this.counter.textContent = `${i + 1} / ${total}`;
		this.notes.textContent = text.notes ?? '';
		this.notes.classList.toggle('on', this.notesVisible && Boolean(text.notes));
		if (!deferCaption) this.setCaption(text.caption ?? '', hudTitle(beat));
	}

	/** Крупная подпись вытесняет маленький заголовок, чтобы не дублировать текст. */
	setCaption(caption, fallbackTitle = '') {
		if (caption !== this.caption.textContent) {
			this.caption.textContent = caption;
			this.caption.classList.remove('on');
			void this.caption.offsetWidth; // перезапустить анимацию появления
		}
		this.caption.classList.toggle('on', Boolean(caption));
		this.name.textContent = caption ? '' : fallbackTitle;
		this.deferred = false;
	}

	/** Перерисовать всё на новом языке, не трогая, на каком бите мы стоим. */
	relocalize() {
		this.renderHelp();
		this.renderLang();
		if (this.beat) {
			this.setBeat(this.beat, this.beatIndex, this.beatTotal, { deferCaption: this.deferred });
		}
	}

	toggleNotes() {
		this.notesVisible = !this.notesVisible;
		this.notes.classList.toggle('on', this.notesVisible && Boolean(this.notes.textContent));
	}

	toggleHelp() { this.help.classList.toggle('on'); }

	setDev(text) { this.dev.textContent = text; }

	flash(message) {
		this.flashEl.textContent = message;
		this.flashEl.classList.add('on');
		clearTimeout(this._flashTimer);
		this._flashTimer = setTimeout(() => this.flashEl.classList.remove('on'), 1600);
	}
}
