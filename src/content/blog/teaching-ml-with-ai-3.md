---
title: "Teaching ML in the Age of AI Agents (3/3)"
description: "Part 3 of 3. Why people like hard things, why you can never fool yourself about what you actually know — and the teaching infrastructure I vibe-coded over the summer."
date: 2026-08-12
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

.tch-stat {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  border: 1px solid rgba(234, 88, 12, 0.25);
  background: rgba(234, 88, 12, 0.05);
  border-radius: 10px;
  padding: 1.1rem 1.3rem;
  margin: 1.5rem 0;
}
.tch-stat .tch-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 2rem;
  font-weight: 600;
  color: #EA580C;
  line-height: 1;
  margin: 0 !important;
  white-space: nowrap;
}
.tch-stat .tch-stat-label { margin: 0 !important; line-height: 1.6; color: #3f3f46; font-size: 0.95rem; }

.tch-launch {
  text-align: center;
  border: 1px dashed rgba(79, 70, 229, 0.45);
  background: rgba(79, 70, 229, 0.04);
  border-radius: 10px;
  padding: 1.3rem 1.2rem;
  margin: 1.5rem 0;
}
.tch-launch a {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1.15rem;
  font-weight: 600;
  color: #4F46E5;
  text-decoration: none;
  border-bottom: 2px solid rgba(79, 70, 229, 0.35);
}
.tch-launch a:hover { color: #7C3AED; border-bottom-color: #7C3AED; }
.tch-launch p { margin: 0.6rem 0 0 !important; font-size: 0.85rem; color: #71717a; line-height: 1.6; }

.tch-features {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  margin: 1.5rem 0;
}
@media (min-width: 720px) {
  .tch-features { grid-template-columns: 1fr 1fr; }
  .tch-feature-wide { grid-column: 1 / -1; }
}
.tch-feature {
  border: 1px solid rgba(79, 70, 229, 0.2);
  background: linear-gradient(180deg, rgba(79, 70, 229, 0.03) 0%, rgba(124, 58, 237, 0.03) 100%);
  border-radius: 10px;
  padding: 1.1rem 1.2rem;
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.06);
}
.tch-feature .tch-feature-name {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.78rem;
  font-weight: 600;
  color: #4F46E5;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0 0 0.5rem !important;
}
.tch-feature p + p { margin: 0.6rem 0 0 !important; }
.tch-feature p:not(.tch-feature-name) { margin: 0 !important; line-height: 1.65; color: #3f3f46; font-size: 0.95rem; }

[data-theme="dark"] .tch-lang-btn { background: #27272a; border-color: #3f3f46; color: #d4d4d8; }
[data-theme="dark"] .tch-lang-btn:hover { background: #3f3f46; }
[data-theme="dark"] .tch-note { background: rgba(22, 163, 74, 0.12); }
[data-theme="dark"] .tch-pullquote { background: rgba(124, 58, 237, 0.14); color: #e9d5ff; }
[data-theme="dark"] .tch-stat { background: rgba(234, 88, 12, 0.12); border-color: rgba(234, 88, 12, 0.4); }
[data-theme="dark"] .tch-stat .tch-stat-value { color: #fb923c; }
[data-theme="dark"] .tch-stat .tch-stat-label { color: #d4d4d8; }
[data-theme="dark"] .tch-launch { background: rgba(79, 70, 229, 0.1); border-color: rgba(124, 58, 237, 0.5); }
[data-theme="dark"] .tch-launch a { color: #c4b5fd; border-bottom-color: rgba(196, 181, 253, 0.4); }
[data-theme="dark"] .tch-launch a:hover { color: #e0e7ff; border-bottom-color: #e0e7ff; }
[data-theme="dark"] .tch-launch p { color: #a1a1aa; }
[data-theme="dark"] .tch-feature { background: linear-gradient(180deg, rgba(79, 70, 229, 0.08) 0%, rgba(124, 58, 237, 0.08) 100%); border-color: rgba(124, 58, 237, 0.35); }
[data-theme="dark"] .tch-feature p:not(.tch-feature-name) { color: #d4d4d8; }
</style>

<div class="tch-lang-switcher not-prose">
<button class="tch-lang-btn tch-lang-active" data-switch-lang="en">English</button>
<button class="tch-lang-btn" data-switch-lang="ru">Русский</button>
</div>

<div class="tch-banner not-prose" data-lang="en">
  <p class="tch-title">Teaching ML in the Age of AI Agents</p>
  <p class="tch-subtitle">You can't fool yourself — and the tool I wanted for classes</p>
  <span class="tch-series">PART 3 / 3</span>
</div>

<div class="tch-banner not-prose lang-hidden" data-lang="ru">
  <p class="tch-title">Преподавание ML в эпоху AI-агентов</p>
  <p class="tch-subtitle">Себя не обманешь — и инструмент мечты для занятий</p>
  <span class="tch-series">ЧАСТЬ 3 / 3</span>
</div>

<div data-lang="en">

![AI, Practice, and Learning — why real understanding, challenge, and good teaching tools still matter](/posts/teaching-ml-with-ai-3/AI_edu_part3.png)

The long-promised third part of the series on AI in education.

Over the summer I vibe-coded myself an infrastructure that comes close to what I'd call ideal, one that should make my classes both more effective and more fun. But let me start not with the tool, but with why you'd still learn anything yourself when AI already knows it all.

## 1. People like hard things

Learning is hard, and plenty of people enjoy it anyway. People seem to enjoy overcoming difficulty in general: until 2014, for instance, the number of IRONMAN 140.6 finishers (3.8 km swim + 180 km bike + 42.2 km run) was growing by roughly 20% every year!

<div class="tch-stat not-prose">
<p class="tch-stat-value">+20%</p>
<p class="tch-stat-label">a year &mdash; that's how the number of IRONMAN 140.6 finishers grew all the way to 2014. Nothing outside these people required them to swim 3.8 km, ride 180, and then run a marathon.</p>
</div>

## 2. You can't fool yourself

On top of that, everyone knows perfectly well on the inside what they really know and can do, and what they can't. Cheating for some external purpose is one thing (passing an exam so you don't get expelled or told off, or getting through a job interview); the inner sense that you've figured something out and now you know it, where before you didn't, is quite another.

The analogy with learning a new foreign language fits well here, and I think it's clear to everyone: at first you know nothing at all, no sounds, no words, maybe not even a single letter of the alphabet. Meanwhile any modern language model "knows" more or less everything already, translates with ease, and even speaks any language present on the internet. We humans have to put a lot of time into a new language (say 5 weeks, 5 days a week, 5 hours a day to go from A2 to B1 :), and then, gradually, we start to remember and recognize words, read faster and read harder texts, split the continuous stream of speech into words and understand them, and eventually even start speaking ourselves.

<div class="tch-pullquote not-prose">
<p>You can cheat on almost any exam, sure, but you can't fool yourself &mdash; a person always knows very well roughly what their own level in a language is, and whether it sits above or below someone else's.</p>
</div>

It's the same in any other kind of education: AI now "knows" almost every field very well and hardly ever gets the basics wrong, but we humans still have to walk the path of mastering a skill ourselves. Only during and after that do we build up intuition, and then the professionalism without which, of course, you can't prompt an LLM effectively.

## 3. The dream tool for ML classes

As for the teaching infrastructure itself, here's a description of my version, which I plan to keep growing into the tool of my dreams.

<div class="tch-launch not-prose">
<a href="https://mlpractice.com/" target="_blank" rel="noopener">mlpractice.com &rarr;</a>
<p>Everything except teacher access is open &mdash; no sign-up, no SMS</p>
</div>

<div class="tch-features not-prose">

<div class="tch-feature">
<p class="tch-feature-name">Problems</p>
<p>A set of small, almost one-line tasks you have to code up and can check yourself right in the browser against local tests. Handy for practice sessions and for checking how well someone knows a language or a library.</p>
</div>

<div class="tch-feature">
<p class="tch-feature-name">Notebooks</p>
<p>Slightly larger tasks in the familiar Jupyter Notebook format.</p>
</div>

<div class="tch-feature tch-feature-wide">
<p class="tch-feature-name">Classes</p>
<p>The important part, with the courses. Each course is a set of sessions whose theory lives in slide decks right here in the browser, and in teacher mode you can add live handwriting to them &mdash; notes, explanations, conclusions &mdash; with a stylus from a tablet. The final version of the deck with all the annotations is saved as a PDF.</p>
<p>The sessions themselves can of course run in whatever format you can build in a browser =) You could launch a team game on solving problems or proving theorems against the clock, for instance.</p>
</div>

<div class="tch-feature">
<p class="tch-feature-name">Monitor</p>
<p>In teacher mode you can watch live, right as the practice session runs, which student is solving what and how fast.</p>
</div>

<div class="tch-feature">
<p class="tch-feature-name">Brainteasers</p>
<p>Just various beautiful math and programming puzzles from my personal collection. The section keeps growing.</p>
</div>

</div>

Some material stayed in Google Colab, since far from every Python library has been ported to WebAssembly, but the system can obviously be extended and added to whenever I feel like it.

<div class="tch-note not-prose">
<p>I will still ask students to register in order to take a course and have their homework checked. The test drive of the new system is next week already, August 17&ndash;21, at a mini ML course for high-school students.</p>
</div>

I'll stop here so as not to tire the dear reader, but if you're interested in all the technical details &mdash; how and how long I prompted, which similar systems I used before &mdash; just leave a comment on LinkedIn or in the Telegram channel, and I'll send the details over by DM.

</div>

<div data-lang="ru" class="lang-hidden">

![AI, Practice, and Learning — почему настоящее понимание, сложности и хорошие инструменты преподавания всё ещё важны](/posts/teaching-ml-with-ai-3/AI_edu_part3.png)

Давненько обещанная третья часть постов про ИИ в образовании.

Как раз за лето навайбкодил себе близкую к идеальной в моём представлении инфраструктуру, которая поможет ещё эффективнее и веселее проводить занятия. Но начну не с неё, а с того, зачем вообще учиться самому, если ИИ и так всё знает.

## 1. Людям нравится преодолевать сложности

Несмотря на то, что учиться сложно, многим людям это нравится. Кажется, людям вообще нравится преодолевать различные сложности: например, до 2014 года количество финишёров IRONMAN 140.6 (3,8 км плавания + 180 км велосипеда + 42,2 км бега) росло примерно на 20% каждый год!

<div class="tch-stat not-prose">
<p class="tch-stat-value">+20%</p>
<p class="tch-stat-label">в год &mdash; так росло число финишёров IRONMAN 140.6 вплоть до 2014 года. Никакой внешней необходимости плыть 3,8 км, ехать 180 и бежать марафон у этих людей не было.</p>
</div>

## 2. Себя не обманешь

Кроме этого, внутри себя любой отлично понимает, что он действительно знает и умеет, а что нет. Одно дело обманывать для каких-то внешних целей (сдать экзамен, чтобы не отчислили или не наругали, или успешно пройти интервью на работу), и совсем другое &mdash; внутреннее ощущение, что в чём-то разобрался и теперь знаешь, а раньше не знал.

Здесь очень уместна и, думаю, всем понятна аналогия с изучением нового иностранного языка: сначала вы вообще ничего не знаете, никаких звуков и слов, может быть даже ни одной буквы алфавита. При этом любая современная языковая модель «знает» уже более-менее всё, легко переводит и даже говорит на любом представленном в интернете языке. Нам же, людям, нужно вложить много времени в изучение нового языка (скажем, 5 недель, 5 дней в неделю, по 5 часов в день на переход A2 -> B1 :), и тогда, постепенно, мы начинаем помнить и узнавать слова, читать всё быстрее и всё более сложные тексты, разделять непрерывный поток устной речи на слова и понимать их, потом даже и говорить сами начинаем.

<div class="tch-pullquote not-prose">
<p>Понятно, что почти на любом экзамене можно считерить, но самого себя не обманешь &mdash; человек всегда очень хорошо знает, какой у него самого примерный уровень владения языком, насколько он выше или ниже уровня владения другого человека.</p>
</div>

Так же и в любом другом образовании: сейчас ИИ очень хорошо «знает» почти любую науку и на базовом уровне уже практически никогда не ошибается, но нам, людям, нужно проходить путь овладения любым навыком самостоятельно. И только в процессе и после этого у нас нарабатывается интуиция и потом появляется профессионализм, без которого, конечно, невозможно эффективно промптить LLM-ки.

## 3. Инструмент мечты для занятий МЛ

Что касается непосредственно инфраструктуры для преподавания, то вот описание моего варианта, из которого планирую продолжать делать инструмент мечты.

<div class="tch-launch not-prose">
<a href="https://mlpractice.com/" target="_blank" rel="noopener">mlpractice.com &rarr;</a>
<p>Всё, кроме преподавательского доступа, открыто без регистрации и смс</p>
</div>

<div class="tch-features not-prose">

<div class="tch-feature">
<p class="tch-feature-name">Problems</p>
<p>Набор небольших, почти однострочных задач, которые нужно закодить и можно проверить себя прямо в браузере на локальных тестах. Полезно для практик и проверки знакомства с языком или библиотекой.</p>
</div>

<div class="tch-feature">
<p class="tch-feature-name">Notebooks</p>
<p>Задачи чуть бо&#x301;льшего объёма в аналоге привычных Jupyter Notebooks.</p>
</div>

<div class="tch-feature tch-feature-wide">
<p class="tch-feature-name">Classes</p>
<p>Важная часть с курсами. В каждом курсе набор занятий, теоретическая часть которых &mdash; это презентации со слайдами здесь же в браузере, которые в режиме преподавателя можно дополнять живыми записями, объяснениями и выводами стилусом с планшета. Финальная версия презентации со всеми написанными комментариями сохраняется в PDF.</p>
<p>При этом сами занятия и активность, конечно, могут быть вообще в любом формате, который вы можете реализовать в браузере =) Например, запустить командную игру по решению задачек или доказательству теорем на скорость.</p>
</div>

<div class="tch-feature">
<p class="tch-feature-name">Monitor</p>
<p>В режиме преподавателя видно вживую, непосредственно в процессе практики, кто из студентов, что и как быстро решает.</p>
</div>

<div class="tch-feature">
<p class="tch-feature-name">Brainteasers</p>
<p>Просто разные красивые задачки по математике и программированию из моей личной коллекции. Раздел дополняется.</p>
</div>

</div>

Некоторые материалы остались в Google Colab, так как далеко не все библиотеки Питона портированы в WebAssembly, но понятно, что эту систему можно расширять и дополнять, если захочется.

<div class="tch-note not-prose">
<p>Для прохождения курса и проверки домашек студентов всё же буду просить зарегистрироваться. Тест-драйв новой системы уже на следующей неделе, с 17 по 21 августа, на мини-курсе по МЛ для школьников старших классов.</p>
</div>

На этом, пожалуй, остановлюсь, чтобы не утомлять уважаемого читателя, но если вам интересны все технические детали &mdash; как и сколько времени я промптил, какие похожие системы раньше использовал &mdash; то смело напишите комментарий в Линкедине или Телеграм канале, и я пришлю детали личным сообщением.

</div>

<script>
(function() {
  var titles = {
    en: 'Teaching ML in the Age of AI Agents (3/3)',
    ru: 'Преподавание ML в эпоху AI-агентов (3/3)'
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
