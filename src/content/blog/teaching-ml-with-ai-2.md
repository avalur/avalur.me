---
title: "Teaching ML in the Age of AI Agents (2/3)"
description: "Part 2 of 3. Why teaching is mostly about skills, not theory — dropping lectures, master-class practicums, and two fresh student posts."
date: 2026-05-21
tags: ["Teaching", "AI", "Education", "Machine Learning"]
readingTime: "5 min"
---

<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

.tch-banner {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #2563EB 100%);
  padding: 2.2rem 1.5rem 1.6rem;
  margin: 0 0 2rem;
  border-radius: 12px;
  color: #fff;
  text-align: center;
  box-shadow: 0 10px 30px rgba(79, 70, 229, 0.18);
}
.tch-banner .tch-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.tch-banner .tch-subtitle {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.85rem;
  margin: 0.7rem 0 0;
  opacity: 0.92;
}
.tch-banner .tch-series {
  display: inline-block;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-family: 'JetBrains Mono', monospace;
  margin-top: 0.9rem;
  letter-spacing: 0.05em;
}

.tch-lang-switcher {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin: 0 0 1rem;
}
.tch-lang-btn {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.75rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid #d4d4d8;
  background: #f5f5f4;
  color: #52525b;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}
.tch-lang-btn:hover { background: #e7e5e4; }
.tch-lang-active {
  background: #4F46E5 !important;
  border-color: #4338CA !important;
  color: #fff !important;
}
.lang-hidden { display: none !important; }

.tch-pullquote {
  border-left: 4px solid #7C3AED;
  background: rgba(124, 58, 237, 0.05);
  padding: 1rem 1.2rem;
  margin: 1.5rem 0;
  border-radius: 0 8px 8px 0;
  font-style: italic;
  color: #4c1d95;
}
.tch-pullquote p { margin: 0 !important; line-height: 1.7; }

.tch-note {
  border-left: 4px solid #16A34A;
  background: rgba(22, 163, 74, 0.06);
  padding: 1rem 1.2rem;
  margin: 1.5rem 0;
  border-radius: 0 8px 8px 0;
}
.tch-note p { margin: 0.4rem 0 !important; line-height: 1.7; }

.tch-student {
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: linear-gradient(180deg, rgba(79, 70, 229, 0.03) 0%, rgba(124, 58, 237, 0.03) 100%);
  border-radius: 10px;
  padding: 1.2rem 1.3rem;
  margin: 1.2rem 0;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.06);
}
.tch-student .tch-student-head {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: #4F46E5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem !important;
}
.tch-student .tch-student-title {
  font-weight: 600;
  margin: 0 0 0.5rem !important;
  line-height: 1.4;
  font-size: 1.02rem;
}
.tch-student .tch-student-title a {
  color: #1e1b4b;
  text-decoration: none;
  border-bottom: 1px dotted rgba(79, 70, 229, 0.45);
}
.tch-student .tch-student-title a:hover {
  color: #4F46E5;
  border-bottom-color: #4F46E5;
}
.tch-student .tch-student-source {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  color: #71717a;
  margin: 0 0 0.7rem !important;
}
.tch-student .tch-student-body { margin: 0 !important; line-height: 1.65; color: #3f3f46; }

[data-theme="dark"] .tch-lang-btn { background: #27272a; border-color: #3f3f46; color: #d4d4d8; }
[data-theme="dark"] .tch-lang-btn:hover { background: #3f3f46; }
[data-theme="dark"] .tch-note { background: rgba(22, 163, 74, 0.12); }
[data-theme="dark"] .tch-pullquote { background: rgba(124, 58, 237, 0.14); color: #e9d5ff; }
[data-theme="dark"] .tch-student { background: linear-gradient(180deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%); border-color: rgba(124, 58, 237, 0.35); }
[data-theme="dark"] .tch-student .tch-student-title a { color: #e0e7ff; }
[data-theme="dark"] .tch-student .tch-student-title a:hover { color: #c4b5fd; }
[data-theme="dark"] .tch-student .tch-student-body { color: #d4d4d8; }
[data-theme="dark"] .tch-student .tch-student-source { color: #a1a1aa; }
</style>

<div class="tch-lang-switcher not-prose">
<button class="tch-lang-btn tch-lang-active" data-switch-lang="en">English</button>
<button class="tch-lang-btn" data-switch-lang="ru">Русский</button>
</div>

<div class="tch-banner not-prose" data-lang="en">
  <p class="tch-title">Teaching ML in the Age of AI Agents</p>
  <p class="tch-subtitle">Skills, not theory — keeping minds in shape</p>
  <span class="tch-series">PART 2 / 3</span>
</div>

<div class="tch-banner not-prose lang-hidden" data-lang="ru">
  <p class="tch-title">Преподавание ML в эпоху AI-агентов</p>
  <p class="tch-subtitle">Навыки, а не теория — как держать разум в тонусе</p>
  <span class="tch-series">ЧАСТЬ 2 / 3</span>
</div>

<div data-lang="en">

![AI, Practice, and Teaching — why skills, reflection, and hands-on learning still matter](/posts/teaching-ml-with-ai-2/ml-teaching-keys.png)

Learning is much less about theoretical knowledge than it is about building your own skills. It's nice to have an all-powerful (not really) AI in your pocket, but success comes from regular practice and keeping your focus over the long haul.

So even in the AI era the teacher's main jobs are the same as before: keep students motivated, evaluate the skills they've actually picked up, develop reflection in them, and make the time they spend at university count for more.

<div class="tch-pullquote not-prose">
<p>There's always a handful of conscientious students who don't really need a teacher all that much — maybe just as a source of interesting problems. That was already true back in the Google era. Everyone else needs a lot of joint work; rewiring your living neural network is hard for everyone.</p>
</div>

## Dropping lectures

In this year's machine learning course I decided to drop the lectures. Last year I recorded all of them on video with nice slides, and now I happily share them with anyone who wants. The freed-up time goes into receiving homework assignments and asking comprehension questions offline in the class: I might ask a student to explain one specific line of the code they handed in, or to write out the formula for the quadratic loss or for cross-entropy.

Next year I'm planning even more hands-on sessions in a master-class format, possibly team-style mini-competitions: sitting down together and writing some model from scratch with your own hands and without AI, or coding up backprop through a convolutional layer the same way.

<div class="tch-note not-prose">
<p>The whole point of these practicums is to keep your mind in shape, in spite of the always-available all-powerful AI in your pocket. Roughly the way we still go to the gym and walk up the stairs, run and swim, in spite of cars, elevators, and ships.</p>
</div>

Homework assignments are designed in the same spirit, to push students into using their own thinking as much as possible. In one of them, for example, students have to write their own post analysing either a paper or a project in machine learning.

## Two fresh student posts

<div class="tch-student not-prose">
<p class="tch-student-head">// Student post &mdash; Stepan Maliarovsky</p>
<p class="tch-student-title"><a href="https://medium.com/@komarik179/agents-puzzles-and-thinking-models-a-recap-of-apples-the-illusion-of-thinking-10a41fdbbd1a" target="_blank" rel="noopener">Agents, Puzzles, and "Thinking" Models: A Recap of Apple's "The Illusion of Thinking"</a></p>
<p class="tch-student-source">Medium</p>
<p class="tch-student-body">A measured recap of Apple's puzzle-based study (Hanoi, Checker Jumping, River Crossing, Blocks World) showing that reasoning LLMs match plain models on easy tasks, pull ahead in the middle, and collapse on hard ones &mdash; with the curious twist that they spend fewer thinking tokens right as accuracy falls off the cliff.</p>
</div>

<div class="tch-student not-prose">
<p class="tch-student-head">// Student post &mdash; Mikhail Malyugin</p>
<p class="tch-student-title"><a href="https://hackmd.io/@miko089/rkHi_P1yfx" target="_blank" rel="noopener">Mixture-of-Recursions (MoR): Recursion That Beats Both Vanilla Transformers and Mixture-of-Experts</a></p>
<p class="tch-student-source">HackMD</p>
<p class="tch-student-body">A deep, well-structured walk-through of Bae et al.'s NeurIPS 2025 paper that fuses parameter sharing, per-token adaptive depth, and recursion-aware KV caching &mdash; with the nice framing that MoE adds horizontal sparsity while MoR adds vertical sparsity, so the two are complementary rather than competing.</p>
</div>

</div>

<div data-lang="ru" class="lang-hidden">

![AI, Practice, and Teaching — почему навыки, рефлексия и практика всё ещё важны](/posts/teaching-ml-with-ai-2/ml-teaching-keys.png)

Обучение &mdash; это не столько про теоретические знания, это про развитие собственных навыков. Конечно, приятно иметь под рукой всемогущий (на самом деле нет) ИИ, но успех зависит от регулярных занятий и долгосрочного сохранения фокуса.

Поэтому и в эру ИИ главными задачами преподавателя остаются поддержание мотивации к учёбе, оценка приобретённых студентами навыков, развитие в них рефлексии и повышение эффективности проведённого в университете времени.

<div class="tch-pullquote not-prose">
<p>Всегда есть какое-то количество сознательных студентов, которым по большому счёту преподаватель не очень-то и нужен, может быть только как источник интересных задач &mdash; так было и в эру Гугла. С остальными нужно много работать вместе, помогать им учиться: ведь перестраивать свои живые нейросети всем нелегко.</p>
</div>

## Отказ от лекций

В своём курсе по машинному обучению с этого года я решил отказаться от лекций, которые в прошлом году все записал на видео с красивыми презентациями, и теперь спокойно делюсь со всеми желающими. В освободившееся время провожу приёмку домашних заданий и спрашиваю вопросы на понимание материала: могу попросить объяснить конкретную строчку сданного ребятами кода или выписать формулу квадратичной функции потерь или кросс-энтропии.

В следующем году ещё планирую сделать больше практик в формате мастер-классов, возможно командных мини-соревнований: вместе написать своими руками с нуля и без ИИ какую-нибудь модель или тот же бэкпроп через свёрточный слой.

<div class="tch-note not-prose">
<p>Главный смысл таких практик &mdash; держать свой разум в тонусе, несмотря на всегда доступный всемогущий ИИ в твоем кармане. Примерно как мы все сейчас ходим в спортзал и по лестницам, бегаем и плаваем, несмотря на автомобили, лифты и корабли.</p>
</div>

Домашние задания тоже максимально способствуют использованию своего собственного мышления. Например, в одном из них студентам нужно написать свой пост с разбором либо статьи, либо проекта по машинному обучению.

## Пара свежих студенческих постов

<div class="tch-student not-prose">
<p class="tch-student-head">// Студенческий пост &mdash; Степан Маляровский</p>
<p class="tch-student-title"><a href="https://medium.com/@komarik179/agents-puzzles-and-thinking-models-a-recap-of-apples-the-illusion-of-thinking-10a41fdbbd1a" target="_blank" rel="noopener">Agents, Puzzles, and "Thinking" Models: A Recap of Apple's "The Illusion of Thinking"</a></p>
<p class="tch-student-source">Medium</p>
<p class="tch-student-body">Аккуратный пересказ работы Apple на головоломках (Ханойские башни, Checker Jumping, River Crossing, Blocks World): reasoning-модели сравниваются с обычными на простых задачах, обгоняют их на средних и проваливаются на сложных &mdash; и любопытно, что прямо в момент обрушения точности они начинают тратить меньше "думающих" токенов.</p>
</div>

<div class="tch-student not-prose">
<p class="tch-student-head">// Студенческий пост &mdash; Михаил Малюгин</p>
<p class="tch-student-title"><a href="https://hackmd.io/@miko089/rkHi_P1yfx" target="_blank" rel="noopener">Mixture-of-Recursions (MoR): Recursion That Beats Both Vanilla Transformers and Mixture-of-Experts</a></p>
<p class="tch-student-source">HackMD</p>
<p class="tch-student-body">Глубокий и аккуратно структурированный разбор статьи Bae et al. с NeurIPS 2025: совмещение шеринга параметров, потокенной адаптивной глубины и recursion-aware KV-кэширования &mdash; с приятной рамкой, что MoE добавляет горизонтальную разреженность, а MoR &mdash; вертикальную, так что два подхода скорее дополняют друг друга, чем соревнуются.</p>
</div>

</div>

<script>
(function() {
  var titles = {
    en: 'Teaching ML in the Age of AI Agents (2/3)',
    ru: 'Преподавание ML в эпоху AI-агентов (2/3)'
  };

  function setLang(lang) {
    localStorage.setItem('tch-post-lang', lang);
    document.querySelectorAll('[data-lang]').forEach(function(el) {
      if (el.dataset.lang === lang) {
        el.classList.remove('lang-hidden');
      } else {
        el.classList.add('lang-hidden');
      }
    });
    document.querySelectorAll('[data-switch-lang]').forEach(function(btn) {
      btn.classList.toggle('tch-lang-active', btn.dataset.switchLang === lang);
    });
    var h1 = document.querySelector('article header h1');
    if (h1) h1.textContent = titles[lang];
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', rebuildTOC, { once: true });
    } else {
      rebuildTOC();
    }
  }

  function rebuildTOC() {
    var sidebar = document.getElementById('toc-sidebar-nav');
    if (!sidebar) return;
    var tocList = sidebar.querySelector('ul');
    if (!tocList) return;
    var article = document.getElementById('article');
    if (!article) return;

    var headings = [];
    article.querySelectorAll('h2, h3').forEach(function(h) {
      var p = h.closest('[data-lang]');
      if (!p || !p.classList.contains('lang-hidden')) headings.push(h);
    });

    tocList.innerHTML = '';
    headings.forEach(function(h) {
      var li = document.createElement('li');
      li.className = 'toc-item' + (h.tagName === 'H3' ? ' toc-h3' : '');
      var a = document.createElement('a');
      a.className = 'toc-link';
      a.href = '#' + h.id;
      a.textContent = h.textContent.replace(/#$/, '').trim();
      li.appendChild(a);
      tocList.appendChild(li);
    });

    var sb = document.getElementById('toc-sidebar');
    if (sb) sb.style.display = headings.length < 2 ? 'none' : '';
  }

  var saved = localStorage.getItem('tch-post-lang') || 'en';
  setLang(saved);

  document.querySelectorAll('[data-switch-lang]').forEach(function(btn) {
    btn.addEventListener('click', function() { setLang(btn.dataset.switchLang); });
  });
})();
</script>
