---
title: "ИИ изменил мою работу. Как у вас?"
description: "Как ИИ изменил мои занятия, подготовку к IMO и IOAI и работу со стажёрами на Кагле."
date: 2026-11-13
tags: ["Teaching", "AI", "Education", "Kaggle"]
readingTime: "6 min"
draft: false
---

<style>
.ai-teaching-switcher { display: flex; flex-wrap: wrap; gap: .5rem; margin-bottom: 1.5rem; }
.ai-teaching-switcher button { border: 1px solid var(--border); border-radius: 6px; padding: .4rem .9rem; background: var(--bg-secondary); color: var(--fg); cursor: pointer; font: inherit; font-size: .85rem; }
.ai-teaching-switcher button[aria-pressed="true"] { background: var(--accent); color: white; border-color: var(--accent); }
.ai-teaching-hidden { display: none !important; }
.ai-teaching-figure { margin: 2rem 0; }
.ai-teaching-figure img { display: block; width: 100%; height: auto; background: #fff; }
.ai-teaching-figure figcaption { margin-top: .65rem; text-align: center; font-size: .85rem; line-height: 1.5; color: var(--fg-secondary); }
</style>

<div class="ai-teaching-switcher not-prose" role="group" aria-label="Язык / Language">
<button type="button" data-teaching-language="ru" aria-pressed="true">Русский</button>
<button type="button" data-teaching-language="en" aria-pressed="false">English</button>
</div>

<div data-teaching-content="ru" lang="ru">

ИИ уже очень плотно вошёл в нашу жизнь. Мы обвешены как минимум двумя подписками на что-нибудь из Claude, GPT, Gemini, Qwen или Kimi. Агенты делают за нас много всякой работы: непрерывно и безотказно пишут платформы, презентации и игры, доказывают теоремы, решают соревнования, планируют путешествия, заполняют налоговые декларации, бронируют гостиницы и заказывают еду.

В этом посте расскажу, как ИИ-революция повлияла на большую часть моей работы, связанной с преподаванием.

## 1. Лекции и практики

В прошлом году я экспериментировал с перевёрнутым форматом и индивидуальной сдачей каждого домашнего задания. При этом осознал, что групповое взаимодействие между студентами в классе тоже очень важно.

Поэтому в этом году вернулся к смешанным занятиям: чередую лекционные блоки с практикой. Ещё добавил подготовленные студентами разборы интересных кейсов и дебаты на горячие темы в ИИ.

А чтобы проверять понимание тем у первокурсников, стараюсь участвовать в устной приёмке задач по анализу и алгебре.

Но сильнее всего влияние ИИ на моё преподавание заметно в подготовке: теперь можно намного быстрее и качественнее готовить занятия и задачи. Например, за несколько дней летом я сделал себе очень удобную [платформу для проведения занятий](https://mlpractice.com/). В ней объединены:

- демонстрация слайдов с возможностью прямо там же добавлять от руки заметки и формулы с планшета;
- набор задач по Питону и МЛ в стиле LeetCode с автотестами прямо в браузере;
- личные кабинеты студента и преподавателя с дедлайнами по домашним заданиям.

Легко можно поддержать любой формат занятий. Например, на этой же платформе я провёл математическую Абаку для детей 8–12 лет на празднике JetBrains.

<figure class="ai-teaching-figure">
<img src="/posts/teaching-with-agent-swarms/classroom-v2.png" alt="Рисованная схема: агенты помогают преподавателю готовить материалы, а студенты обсуждают идеи и решают задачи вместе." width="1536" height="1024" loading="lazy" />
<figcaption>Агенты ускоряют подготовку. В классе остаётся место для обсуждений, практики и вопросов.</figcaption>
</figure>

## 2. Подготовка к IMO и IOAI

Здесь влияние ИИ, кажется, наименее заметно: это соревнования людей с довольно строгими ограничениями. В математике — вообще только ручка и бумага. В тех AI-соревнованиях, к которым мы готовимся, доступна не самая сильная модель, которая не может качественно решить предлагаемые задачи с одного промпта. Поэтому в обоих случаях вклад человека остаётся решающим.

А чтобы суметь этот вклад сделать, нужно готовиться как в старые добрые времена: буквально по книжкам и курсам глубоко вникать в идеи, прорешивать задачи возрастающей сложности и учиться сохранять фокус в течение пяти часов.

Агенты, опять же, могут быстро собирать качественные материалы и упражнения для подготовки. То есть, когда понятно, в чём именно слабые места, их можно эффективно усилить с ИИ-помощью.

<figure class="ai-teaching-figure">
<img src="/posts/teaching-with-agent-swarms/olympiad.png" alt="Рисованная схема подготовки к олимпиаде: робот подбирает упражнения, а ученик сам проходит путь от книг и простых задач к сложным и долгой сосредоточенной работе." width="1536" height="1024" loading="lazy" />
<figcaption>Подобрать упражнения стало легче. Глубоко разобраться и научиться решать всё ещё нужно самому.</figcaption>
</figure>

## 3. Стажёры и Кагл

В стародавние времена — больше десяти лет назад — на Кагле была очень понятная мотивация собираться в команды: соревнование обычно идёт несколько месяцев, и больше людей просто могут реализовать и проверить больше идей.

Сейчас на первый взгляд возникает тот же вопрос, что и со стажёрами: зачем нужен кто-то ещё, если есть такой отзывчивый и приятный рой агентов, которых можно замыкать в лупы?

Оказывается, что по-прежнему **один человек с роем агентов уступает команде людей, у каждого из которых свой рой агентов** =)

Студенты по-прежнему любопытные, голодные до всего и могут предложить какой-то новый взгляд на проблему. А сейчас они ещё и AI-native: умеют сбрасывать лимиты агентов и находить очень эффективные пути решения задач.

Изменение здесь только в том, что без этих самых агентских лупов, по моим ощущениям, уже невозможно говорить хоть о каком-то результате!

<figure class="ai-teaching-figure">
<img src="/posts/teaching-with-agent-swarms/team-v2.png" alt="Рисованное сравнение: преподаватель с несколькими роботами и команда преподавателя со студентами, у каждого из которых свои роботы; команда объединяет разные идеи." width="1536" height="1024" loading="lazy" />
<figcaption>Один человек + рой агентов &lt; команда людей, у каждого из которых свой рой агентов</figcaption>
</figure>

Расскажите в комментариях, как ИИ повлиял на вашу повседневную работу?

</div>

<div data-teaching-content="en" lang="en" class="ai-teaching-hidden">

AI has become a very big part of our lives. We're all juggling at least two subscriptions to some combination of Claude, GPT, Gemini, Qwen, or Kimi. Agents do all sorts of work for us: tirelessly building platforms, presentations, and games, proving theorems, tackling competitions, planning trips, filling out tax returns, booking hotels, and ordering food.

In this post, I'll share how the AI revolution has affected most of the teaching-related work I do.

## 1. Lectures and practice sessions

Last year, I experimented with a flipped classroom and individual oral reviews of every homework assignment. Along the way, I realised that students interacting as a group in the classroom matters a lot, too.

So this year I've returned to a mixed format, alternating lecture blocks with practice. I've also added student-led discussions of interesting cases and debates on hot topics in AI.

And to check how well first-year students understand the material, I try to take part in oral reviews of their calculus and algebra solutions.

But the biggest effect of AI on my teaching has been on preparation: I can now prepare better classes and problems much faster. For example, over just a few days this summer, I built myself a very convenient [teaching platform](https://mlpractice.com/). It brings together:

- slide presentations that I can annotate with handwritten notes and formulas directly from a tablet;
- a set of LeetCode-style Python and ML problems with automated tests right in the browser;
- student and teacher dashboards with homework deadlines.

It's easy to support any class format. For instance, I used the same platform to run a maths Abaka for children aged 8–12 at a JetBrains celebration.

<figure class="ai-teaching-figure">
<img src="/posts/teaching-with-agent-swarms/classroom-v2.png" alt="Hand-drawn diagram: agents help a teacher prepare materials while students discuss ideas and solve problems together." width="1536" height="1024" loading="lazy" />
<figcaption>Agents speed up preparation. The classroom still has room for discussion, practice, and questions.</figcaption>
</figure>

## 2. Preparing for IMO and IOAI

This is where AI seems to have had the least visible effect: these are competitions for humans, with fairly strict restrictions. In maths, it's just pen and paper. In the AI competitions we're preparing for, the available model isn't powerful enough to solve the tasks well from a single prompt. So in both cases, the human contribution remains decisive.

And to be able to make that contribution, you have to prepare the good old-fashioned way: work through books and courses, really understand the ideas, solve increasingly difficult problems, and learn to stay focused for five hours.

Again, agents can quickly put together good preparation materials and exercises. Once you know exactly where the weak spots are, AI can help you work on them efficiently.

<figure class="ai-teaching-figure">
<img src="/posts/teaching-with-agent-swarms/olympiad.png" alt="Hand-drawn olympiad preparation diagram: a robot selects exercises while a student follows the path from books and easier problems to harder ones and sustained concentration." width="1536" height="1024" loading="lazy" />
<figcaption>Finding exercises is easier now. Understanding the ideas and learning to solve the problems is still your own work.</figcaption>
</figure>

## 3. Interns and Kaggle

In the olden days — more than ten years ago — there was a very clear reason to form teams on Kaggle: a competition usually runs for several months, and more people can simply implement and test more ideas.

At first glance, the question today is the same one you might ask about interns: why do you need anyone else when you have such a helpful, pleasant swarm of agents that you can run in loops?

It turns out that **one person with a swarm of agents still loses to a team of people who each have their own swarm of agents** =)

Students are still curious, hungry to explore, and capable of bringing a fresh perspective to a problem. And now they're AI-native, too: they know how to reset agent limits and find very efficient ways to solve tasks.

The only change here is that, in my experience, without those agent loops it's become impossible to talk about getting any results at all!

<figure class="ai-teaching-figure">
<img src="/posts/teaching-with-agent-swarms/team-v2.png" alt="Hand-drawn comparison: a teacher with several robots versus a team of the teacher and students, each with their own robots, bringing different ideas together." width="1536" height="1024" loading="lazy" />
<figcaption>One person + a swarm of agents &lt; a team of people, each with their own swarm of agents</figcaption>
</figure>

Tell me in the comments: how has AI affected your day-to-day work?

</div>

<script>
(function () {
  var titles = {
    ru: 'ИИ изменил мою работу. Как у вас?',
    en: 'AI Changed My Work. How About Yours?'
  };
  var storageKey = 'ai-teaching-post-lang';
  var queryLang = new URL(window.location.href).searchParams.get('lang');
  var savedLang;
  try { savedLang = localStorage.getItem(storageKey); } catch (_) {}

  function updateToc(lang) {
    document.querySelectorAll('#toc-sidebar-nav .toc-link, #mobile-toc .toc-link').forEach(function (link) {
      var heading = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      var section = heading && heading.closest('[data-teaching-content]');
      var item = link.closest('li');
      if (item && section) item.hidden = section.dataset.teachingContent !== lang;
    });
    var label = document.getElementById('toc-pill-label');
    if (label) label.textContent = lang === 'ru' ? 'В этом посте' : 'On this page';
  }

  function setLang(lang) {
    if (lang !== 'en') lang = 'ru';
    try { localStorage.setItem(storageKey, lang); } catch (_) {}
    document.querySelectorAll('[data-teaching-content]').forEach(function (section) {
      section.classList.toggle('ai-teaching-hidden', section.dataset.teachingContent !== lang);
    });
    document.querySelectorAll('[data-teaching-language]').forEach(function (button) {
      button.setAttribute('aria-pressed', String(button.dataset.teachingLanguage === lang));
    });
    var h1 = document.querySelector('article header h1');
    if (h1) h1.textContent = titles[lang];
    document.title = document.title.replace(/^[\s\S]*?(?= \| )/, titles[lang]);
    document.documentElement.lang = lang;
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { updateToc(lang); }, { once: true });
    } else {
      updateToc(lang);
    }
  }

  setLang(queryLang === 'ru' || queryLang === 'en' ? queryLang : savedLang || 'ru');
  document.querySelectorAll('[data-teaching-language]').forEach(function (button) {
    button.addEventListener('click', function () {
      var lang = button.dataset.teachingLanguage;
      setLang(lang);
      var url = new URL(window.location.href);
      url.searchParams.set('lang', lang);
      url.hash = '';
      history.replaceState(null, '', url);
    });
  });
})();
</script>
