// English version of the talk. Structure lives in slides/slides.js; this file
// is text only — and the text is what layout depends on, since the 1280×720
// slide canvas does not stretch. English runs ~10 % longer than Russian, so a
// few lines here are deliberately shorter than a literal translation.
//
// Имена межнарников — в написании из research/participants.csv, то есть так,
// как они значатся в официальных результатах IMO.

export default {
	doc: {
		title: 'How to raise an IMO medalist — a 3D talk',
		description: 'What actually raises a future IMO medalist: an early start, '
			+ 'mathematics done regularly, a club with motivated classmates and frequent '
			+ 'competitions, individual and team. A 3D talk on where the medalists come from.',
	},

	ui: {
		langLabel: 'English',
		help: [
			['Space · → · ↵', 'next beat'],
			['← · Backspace', 'previous'],
			['Home / End', 'start / end'],
			['1…9', 'jump to a beat'],
			['r', 'replay the beat animation'],
			['n', 'speaker notes'],
			['l', 'English / Russian'],
			['h', 'this help'],
			['f', 'fullscreen'],
			['o', 'free camera (?dev)'],
			['c', 'copy the camera state (?dev)'],
		],
		helpTitle: 'Controls',
		flash: {
			orbitOn: 'free camera: on',
			orbitOff: 'free camera: off',
			replay: 'animation replayed',
			camCopied: 'camera state copied',
			lang: 'language: English',
		},
	},

	beats: {
		'space': {
			title: 'Earth',
			caption: 'Planet Earth',
			notes: 'Pause. Give the room five seconds to just look at the planet.',
		},
		'to-siberia': {
			title: 'Siberia',
			caption: 'Siberia',
			notes: 'We arrive and the outline traces itself. Press “r” to replay.',
		},
		'to-novosibirsk': {
			title: 'Novosibirsk',
			caption: 'Novosibirsk',
			notes: 'The Ob, the reservoir, the city. Akademgorodok is further south, in the forest.',
		},
		'akademgorodok': {
			title: 'Akademgorodok',
			caption: 'Akademgorodok',
			notes: 'The outline of Akademgorodok. The ground scene comes next.',
		},
		'campus-air': {
			title: 'FMSh',
			caption: 'FMSh',
			notes: 'Stage change through a fade. Forest, street, school, dormitories, NSU.',
		},
		'campus-entrance': {
			title: 'Entrance',
			notes: 'One descent from altitude straight to the doors. Worth saying here that the model is schematic.',
		},
		'classroom': {
			title: 'Classroom',
			notes: 'We are inside. The slides hang on the blackboard — they are plain HTML.',
		},
		'photo-1977': {
			title: 'Class of 1977',
			notes: 'FMSh No. 165, form 10-7, 1977. Third row on the right — D. von der Flaass.',
		},
		'slide-flaass': {
			title: 'Flaass',
			notes: 'The same Flaass from the 1977 board, grown up. IMO 1977, bronze at fifteen.',
		},
		'slide-andrey': {
			title: 'Andrey',
			notes: 'Every rung of the olympiad ladder in a row; in 1984 the team takes first place in Prague. Photo from 1987.',
		},
		'slide-roster': {
			title: 'Medalists',
			notes: 'Forty years in one list. Between 1984 and 2016 an ellipsis — that is a separate conversation. '
				+ 'Two clicks: first 2016 (dimmed — they did not make it), then the last three rows.',
		},
		'sovenok': {
			title: 'Sovenok',
			notes: 'The Sovenok club, grade 9: a schedule of problem sheets and olympiads — this is what an IMO medalist grows out of.',
		},
		'spb-book': {
			title: 'Saint Petersburg',
			notes: 'Back to the blackboard: “Leningrad Mathematical Circles” — the book the club is actually taught from.',
		},
		'team-origins': {
			title: 'Where the team is from',
			notes: 'Share of team places by the city of the school, 1959–2026. Grey is not “regions” '
				+ 'but gaps in the sources: before the 1990s the line-up by city is hard to reconstruct.',
		},
		'famous': {
			title: 'Famous medalists',
			notes: 'Six lives from Toom to Durov: the medal is an entrance, not a result. '
				+ 'Years and medals checked against participants.csv.',
		},
		'window': {
			title: 'Out of the window',
			notes: 'A pause before the finale: outside is the same forest we flew over.',
		},
		'thanks': {
			title: 'Howto',
			notes: 'Five points and a link to the channel. The heading scatters under the cursor — '
				+ 'handy while the questions are coming.',
		},
	},

	// Заголовок финального слайда — он набирается точками на холсте, а не текстом.
	balls: 'Howto become an IMO medalist',

	slides: {
		'title': `
			<div class="kicker">Cyprus, Larnaka Roof Talks #6</div>
			<h1>How to raise an IMO medalist<br>in mathematics?</h1>
			<div class="byline">Sasha Avdiushenko, 15 August 2026</div>`,

		'flaass': `
			<img class="portrait" src="./images/fon_der_flaas_600.jpg" alt="Dima von der Flaass">
			<div class="bio-text">
				<h2>Dima von der Flaass</h2>
				<ul>
					<li>Born in 1962 in Perm Krai, into the family of a doctor of geological sciences</li>
					<li>Entered FMSh in Novosibirsk in 1975</li>
					<li>At the age of 15 took bronze for the USSR team at IMO 1977, and
						that same summer entered the Mechanics and Mathematics faculty of NSU</li>
				</ul>
			</div>`,

		'andrey': `
			<h2>Andrey Astrelin</h2>
			<ul>
				<li><b>1983</b> — district, city, regional, zonal, republican and, finally,
				the all-Union olympiad: the way onto the IMO team</li>
				<li><b>1984</b> — in Prague the USSR team took a confident first place, Andrey first among them</li>
			</ul>
			<p>Andrey got his school certificate at the newly built school No. 119 in Shlyuz.
				Then Moscow, Mechanics and Mathematics at MSU.</p>
			<figure>
				<img src="./images/andrey_astrelin.jpg" alt="1987, Akademgorodok: Andrey, Pavel, Ksenia">
				<figcaption>1987, Akademgorodok:<br>
				<a href="https://superliminal.com/andrey/biografiya.html">
				Andrey, Pavel and Ksenia Astrelin</a>
				</figcaption>
			</figure>`,

		'roster': `
			<h2>IMO medalists from Novosibirsk</h2>
			<ul>
				<li><span class="y">1977</span><span>Dima von der Flaass</span></li>
				<li><span class="y">1984</span><span>Andrey Astrelin</span></li>
				<li class="gap"><span class="y">.<br>.<br>.</span><span></span></li>
				<li data-at="1" class="dim"><span class="y">2016</span><span>Andrey Sergunin and Ilya Dumansky
					just missed out — team candidates</span></li>
				<li data-at="2"><span class="y">2017</span><span>Nikita Dobronravov (twin brother Egor — a candidate)</span></li>
				<li data-at="2"><span class="y">2019, 2020</span><span>Alexey Lvov</span></li>
				<li data-at="2"><span class="y">2023, 2024</span><span>Ratibor Koptilin</span></li>
			</ul>`,

		'spb': `
			<h2>Saint Petersburg</h2>
			<div class="row">
				<img src="./images/spb_circles.png"
					alt="S. Genkin, I. Itenberg, D. Fomin. Leningrad Mathematical Circles">
				<p>The classic manual by Sergey Genkin, Ilya Itenberg and Dmitry Fomin,
					prepared with Igor Rubanov (1994). In English it came out as
					<i>Mathematical Circles (Russian Experience)</i>, AMS 1996.
					<br>Effectively a ready-made programme for a school maths club, grades 6–8.</p>
			</div>`,

		'team-chart': `<iframe src="./research/team_composition_chart.html?embed&amp;lang=en"
			title="Where the USSR/Russia IMO team comes from"></iframe>`,

		'famous': `
			<h2>Famous IMO medalists from USSR/Russia</h2>
			<ul>
				<li>
					<span class="who">Andrei Toom
						<span class="y">1959 · <b class="bronze">B</b></span></span>
					<span class="what">mathematician, the Toom — Cook algorithm (1963)</span>
				</li>
				<li>
					<span class="who">Yuri Matiyasevich
						<span class="y">1964 · <b>G</b></span></span>
					<span class="what">Hilbert’s tenth problem (1970)</span>
				</li>
				<li>
					<span class="who">Grigori Perelman
						<span class="y">1982 · <b>G</b></span></span>
					<span class="what">proved the Poincaré conjecture (2003)</span>
				</li>
				<li>
					<span class="who">Stanislav Smirnov
						<span class="y">1986, 1987 · <b>G</b> <b>G</b></span></span>
					<span class="what">proved Cardy’s formula for percolation, Fields Medal,
						founded the Mathematics and CS faculty at SPbU</span>
				</li>
				<li>
					<span class="who">Eugenia Malinnikova
						<span class="y">1989, 1990, 1991 · <b>G</b> <b>G</b> <b>G</b></span></span>
					<span class="what">Clay Research Award (2017), professor — Norway,
						now Stanford</span>
				</li>
				<li>
					<span class="who">Nikolai Durov
						<span class="y">1996, 1997, 1998 · <b>G</b> <b>G</b> <b>G</b></span></span>
					<span class="what">co-founder of VKontakte and Telegram, Pavel’s brother</span>
				</li>
			</ul>`,

		'howto': `
			<canvas class="balls"></canvas>
			<div class="head"></div>
			<div class="row">
				<ol>
					<li>Be born into a family of scientists</li>
					<li>Preferably in Saint Petersburg</li>
					<li>Start early, do a lot of mathematics, and do it regularly</li>
					<li>A maths club and motivated classmates help enormously</li>
					<li>Compete often, individually and in teams</li>
				</ol>
				<div class="side">
					<div class="qr"></div>
					<a class="tg" target="_blank" rel="noopener"
						href="https://t.me/TechneNotes">@TechneNotes</a>
				</div>
			</div>`,
	},

	panels: {
		'panel-1977': `<img src="./images/77_10_7_flaas.jpg"
			alt="FMSh No. 165, graduating form 10-7, 1977">`,

		// Скриншот русской страницы — сам он не переводится, меняется только alt.
		'panel-sovenok': `
			<img src="./images/sovenok_2026.png" alt="The Sovenok maths club, grade 9, 2025/2026">
			<a class="source" target="_blank" rel="noopener"
				href="https://www.sovenok.academy/groups-academ/9-%D0%BA%D0%BB%D0%B0%D1%81%D1%81-2025-2026-%D1%83%D1%87%D0%B5%D0%B1%D0%BD%D1%8B%D0%B9-%D0%B3%D0%BE%D0%B4"
				>sovenok.academy ↗</a>`,

		'panel-task': `
			<h2>Problem of the day</h2>
			<p class="lead">the statement goes here — room<br>for a formula and a diagram</p>
			<p class="note">placeholder poster No. 2</p>`,

		'panel-blank': `
			<h2>Empty</h2>
			<p class="note">spare poster</p>`,
	},
};
