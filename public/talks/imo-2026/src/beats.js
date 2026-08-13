// The talk as a list of "beats". One key press = one beat.
//
// A beat is: which stage we are on, where the camera ends up, how long the move
// takes, and (optionally) which slide is on the blackboard. Beats inside the
// same stage are interpolated; changing stage cuts through a short fade.
//
// Authoring tip: open ?dev, fly around with the mouse, press C — the current
// camera state is printed and copied to the clipboard, ready to paste here.
//
// Текста здесь нет: заголовок бита, крупная подпись и заметки докладчика
// лежат в словарях i18n/ru.js и i18n/en.js под тем же id.

// Кадр «доска почти во весь экран»: аудитории практически не видно, слайд
// читается как обычный слайд. Слайд на доске — 4,7 м шириной (16:9), центр на
// высоте 1,95, плоскость на z = −4,42. При fov 45° половина высоты кадра равна
// d·tan22,5° = 0,414·d, то есть слайд совпал бы с кадром ровно на d = 3,19.
// Берём 3,45: слайд занимает ~92 % кадра, по краям остаётся узкая полоска
// доски — иначе слайд идёт вплотную по границе экрана и это выглядит обрезанным.
const BOARD_FILL = { kind: 'free', pos: [0, 1.95, -0.97], target: [0, 1.95, -4.42], fov: 45 };

export const beats = [
	{
		id: 'space',
		stage: 'earth',
		cam: { kind: 'geo', lat: 14, lon: 44, alt: 20000, heading: 0, pitch: -90 },
		drift: { lon: 0.35 },
	},
	{
		id: 'to-siberia',
		stage: 'earth',
		captionWith: 'action', // подпись появляется вместе с началом обводки
		action: 'trace-siberia', // запускается, когда камера приехала
		dur: 7,
		// Кадр скомпонован так, чтобы весь контур Сибири влез с запасом.
		cam: { kind: 'geo', lat: 60, lon: 105, alt: 7000, heading: 0, pitch: -84 },
		drift: { lon: 0.04 },
	},
	{
		id: 'to-novosibirsk',
		stage: 'earth',
		captionWith: 'action',
		action: 'trace-novosibirsk',
		dur: 6.5,
		cam: { kind: 'geo', lat: 54.975, lon: 82.99, alt: 76, heading: 0, pitch: -88 },
	},
	{
		id: 'akademgorodok',
		stage: 'earth',
		captionWith: 'action',
		action: 'trace-akademgorodok',
		dur: 3,
		cam: { kind: 'geo', lat: 54.838, lon: 83.099, alt: 30, heading: 0, pitch: -88 },
	},

	{
		id: 'campus-air',
		stage: 'campus',
		cam: { kind: 'free', pos: [45, 128, 290], target: [0, 12, 30], fov: 47 },
	},
	{
		id: 'campus-entrance',
		stage: 'campus',
		dur: 10,
		cam: { kind: 'free', pos: [-17, 2.2, 45], target: [1, 3.6, 29], fov: 50 },
	},

	{
		id: 'classroom',
		stage: 'classroom',
		slide: 0,
		cam: { kind: 'free', pos: [1.4, 1.7, 3.4], target: [-0.2, 1.95, -4.4], fov: 55 },
	},
	{
		id: 'photo-1977',
		stage: 'classroom',
		panels: [0, null], // левая картина — фотография, правую не трогаем
		dur: 3.5,
		// Прямо перед левой картиной: снимок занимает кадр, но рама и немного
		// стены видны — иначе непонятно, что это картина на стене.
		// Строго по нормали к картине: снимок в кадре не перекошен.
		cam: { kind: 'free', pos: [2.6, 1.8, -2.25], target: [5.5, 1.8, -2.25], fov: 46 },
	},
	{
		id: 'slide-flaass',
		stage: 'classroom',
		hudTitle: false, // заголовок есть на самом слайде
		slide: 1,
		dur: 2.2,
		// От картины на стене — вплотную к доске: дальше слайды идут во весь экран.
		cam: { ...BOARD_FILL },
	},
	{
		id: 'slide-andrey',
		stage: 'classroom',
		hudTitle: false, // заголовок есть на самом слайде
		slide: 2,
		dur: 2.2,
		cam: { ...BOARD_FILL },
	},
	{
		id: 'slide-roster',
		stage: 'classroom',
		hudTitle: false, // заголовок есть на самом слайде
		slide: 3,
		// Список раскрывается по клику: 1977 и 1984 с многоточием → 2016-й →
		// остальные три строки. Какая строка на каком шаге — в разметке слайда
		// (`data-at` в i18n/*.js).
		steps: 3,
		dur: 2.2,
		cam: { ...BOARD_FILL },
	},
	{
		id: 'sovenok',
		stage: 'classroom',
		hudTitle: false, // заголовок есть на самом слайде
		panels: [null, 1], // правая картина; левую (планшет 1977) не трогаем
		dur: 2.6,
		// Строго по нормали к правой картине, вплотную: скриншот занимает ~92 %
		// высоты кадра — столько же, сколько слайд на доске, — и по краям видна
		// рама. Картина 2,6 × 1,67 м, её плоскость на x = 5,41.
		cam: { kind: 'free', pos: [3.28, 1.78, 1.6], target: [5.5, 1.78, 1.6], fov: 46 },
	},
	{
		id: 'spb-book',
		stage: 'classroom',
		hudTitle: false, // заголовок есть на самом слайде
		slide: 4,
		dur: 2.6,
		cam: { ...BOARD_FILL },
	},
	{
		id: 'team-origins',
		stage: 'classroom',
		hudTitle: false, // заголовок есть на самом слайде
		slide: 5,
		dur: 2.6,
		cam: { ...BOARD_FILL },
	},
	{
		id: 'famous',
		stage: 'classroom',
		hudTitle: false, // заголовок есть на самом слайде
		slide: 6,
		dur: 2.4,
		cam: { ...BOARD_FILL },
	},
	{
		id: 'window',
		stage: 'classroom',
		dur: 3.5,
		// Окна — на левой стене (−X), поэтому и поворот головы влево.
		cam: { kind: 'free', pos: [1.6, 1.62, 1.2], target: [-5.5, 1.95, -0.4], fov: 55 },
	},
	{
		id: 'thanks',
		stage: 'classroom',
		hudTitle: false, // заголовок есть на самом слайде
		slide: 7,
		dur: 3,
		cam: { ...BOARD_FILL },
	},
];
