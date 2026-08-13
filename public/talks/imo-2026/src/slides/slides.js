// Slides are real HTML, hung inside the 3D scene with CSS3DRenderer. That means
// crisp text (not a blurry texture), normal CSS animations, and copy-pasteable
// content — while still living on the blackboard in the right perspective.
//
// Слайды на доске — 1280×720 CSS-пикселей; доска сжимает их до метров.
// Плакаты на правой стене вдвое уже, поэтому у них меньше «холст» (800×450):
// тот же кегль в CSS-пикселях выходит на стене физически крупнее, иначе с места
// зрителя текст на плакате был бы вдвое мельче доски.
//
// Здесь — только структура: порядок слайдов, их CSS-классы и хук init() для
// «живых» слайдов. Текст лежит в словарях i18n/ru.js и i18n/en.js и берётся по
// id, чтобы вёрстка и код не удваивались на каждый язык.

import { CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';
import { t } from '../i18n/index.js';
import { initBalls } from './balls.js';
import { QR_MATRIX } from './qr_techne.js';

export const SLIDE_DEFS = [
	{ id: 'title', cls: 'dark' },
	{ id: 'flaass', cls: 'dark bio' },
	{ id: 'andrey', cls: 'dark story' },
	{ id: 'roster', cls: 'dark roster' },
	{ id: 'spb', cls: 'dark spb' },
	{ id: 'team-chart', cls: 'dark chart' },
	{ id: 'famous', cls: 'dark famous' },
	{
		id: 'howto',
		cls: 'dark howto',
		// Финальный слайд «живой»: заголовок и QR-код на канал набираются точками
		// на холсте и рассыпаются от курсора. init() возвращает функцию остановки —
		// колода зовёт её, когда со слайда уходят или когда переключили язык.
		init(el, dict) {
			return initBalls(el.querySelector('.balls'), {
				text: dict.balls,
				box: el.querySelector('.head'),
				qr: { matrix: QR_MATRIX, box: el.querySelector('.qr') },
			});
		},
	},
];

// Картины на правой стене. Первые две — настоящие, дальше заглушки.
export const PANEL_DEFS = [
	{ id: 'panel-1977', cls: 'photo' },
	{ id: 'panel-sovenok', cls: 'photo' },
	{ id: 'panel-task', cls: 'poster' },
	{ id: 'panel-blank', cls: 'poster' },
];

/**
 * A slide surface that lives in the 3D scene.
 * @param {number} widthMeters physical width of the surface
 * @param {object} [opts]
 * @param {Array}  [opts.slides] which deck to show (SLIDE_DEFS / PANEL_DEFS)
 * @param {string} [opts.bundle] раздел словаря с текстом: 'slides' или 'panels'
 * @param {number} [opts.canvasWidth] CSS-ширина холста
 * @param {number} [opts.aspect] отношение ширины к высоте (по умолчанию 16:9)
 * @param {number} [opts.start] стартовый слайд
 */
export function createSlideDeck(widthMeters = 4.4, opts = {}) {
	const {
		slides = SLIDE_DEFS, bundle = 'slides',
		canvasWidth = 1280, aspect = 16 / 9, start = 0,
	} = opts;
	const el = document.createElement('div');
	el.className = 'slide-frame';
	el.style.width = `${canvasWidth}px`;
	el.style.height = `${Math.round(canvasWidth / aspect)}px`;
	const slide = document.createElement('div');
	slide.className = 'slide chalk';
	el.appendChild(slide);

	const object = new CSS3DObject(el);
	// CSS3DObject ставит элементу pointer-events: auto инлайном — это сильнее,
	// чем `#css3d { pointer-events: none }` в стилях, и слайд начинает ловить
	// клики вместо канваса: на битах, где доска во весь экран, доклад переставал
	// листаться мышью. Слайд — декорация, мышь ему не нужна; ссылки внутри
	// (плашка источника, канал в финале) включают её себе сами.
	el.style.pointerEvents = 'none';
	const scale = widthMeters / canvasWidth;
	object.scale.setScalar(scale);

	let index = -1;
	let step = 0;       // шаг раскрытия: им управляет director, а показывает CSS
	let dispose = null; // остановить «живой» слайд, когда с него уходят

	function render() {
		const def = slides[index];
		const dict = t();
		dispose?.();
		dispose = null;
		slide.className = `slide ${def.cls || 'chalk'}`;
		slide.dataset.step = String(step);
		slide.innerHTML = dict[bundle][def.id] ?? '';
		// Re-trigger the entrance animation.
		slide.style.animation = 'none';
		void slide.offsetWidth;
		slide.style.animation = '';
		// init() после offsetWidth: вёрстка уже посчитана, и он может мерить свои
		// блоки. Словарь передаём внутрь — заголовок из точек тоже переводится.
		dispose = def.init?.(slide, dict) ?? null;
	}

	function setSlide(i) {
		const next = ((i % slides.length) + slides.length) % slides.length;
		if (next === index) return;
		index = next;
		step = 0;
		render();
	}

	/**
	 * Шаг раскрытия слайда. Само раскрытие — на CSS: строки с `data-at` больше
	 * текущего шага стоят прозрачными, но место занимают, поэтому список не
	 * прыгает, когда строка появляется (см. .slide.roster в styles.css).
	 */
	function setStep(n) {
		step = n;
		slide.dataset.step = String(n);
	}

	/** Перерисовать текущий слайд — например, когда переключили язык. */
	function refresh() {
		if (index >= 0) render();
	}

	setSlide(start);

	return {
		object, setSlide, setStep, refresh,
		get index() { return index; },
		count: slides.length,
	};
}
