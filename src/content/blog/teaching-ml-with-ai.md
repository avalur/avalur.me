---
title: "Teaching ML in the Age of AI Agents (1/3)"
description: "Part 1 of 3. Three years of AI agents changing how students learn machine learning, and what a strong homework actually looks like in 2026."
date: 2026-05-12
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

.tch-timeline {
  display: grid;
  gap: 1rem;
  margin: 1.5rem 0;
}
.tch-milestone {
  border-left: 4px solid var(--tch-accent, #4F46E5);
  background: var(--tch-bg, rgba(79, 70, 229, 0.04));
  padding: 1rem 1.2rem;
  border-radius: 0 8px 8px 0;
}
.tch-milestone-date {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--tch-accent, #4F46E5);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin: 0 0 0.45rem !important;
}
.tch-milestone p { margin: 0 !important; line-height: 1.65; }
.tch-milestone p + p { margin-top: 0.5rem !important; }
.tch-m-2023 { --tch-accent: #6366F1; --tch-bg: rgba(99, 102, 241, 0.05); }
.tch-m-2024 { --tch-accent: #0891B2; --tch-bg: rgba(8, 145, 178, 0.05); }
.tch-m-2025 { --tch-accent: #EA580C; --tch-bg: rgba(234, 88, 12, 0.05); }
.tch-m-2026 { --tch-accent: #16A34A; --tch-bg: rgba(22, 163, 74, 0.05); }

.tch-spec {
  background: #0f172a;
  color: #cbd5e1;
  padding: 1.2rem 1.4rem 1.2rem 2.2rem;
  border-radius: 10px;
  margin: 1.5rem 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.82rem;
  line-height: 1.65;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.2);
  overflow-x: auto;
}
.tch-spec .tch-spec-head {
  color: #38bdf8;
  font-weight: 600;
  margin: 0 0 0.7rem !important;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.tch-spec ul {
  margin: 0 !important;
  padding-left: 0 !important;
  list-style: none !important;
}
.tch-spec li {
  padding: 0.35rem 0 !important;
  position: relative;
  color: #cbd5e1 !important;
  margin: 0 !important;
}
.tch-spec li::before {
  content: '$';
  color: #4ade80;
  position: absolute;
  left: -1.1rem;
  font-weight: 600;
}
.tch-spec code {
  background: rgba(56, 189, 248, 0.12);
  color: #7dd3fc !important;
  padding: 0.05rem 0.35rem;
  border-radius: 3px;
  font-size: 0.8rem;
}

.tch-note {
  border-left: 4px solid #16A34A;
  background: rgba(22, 163, 74, 0.06);
  padding: 1rem 1.2rem;
  margin: 1.5rem 0;
  border-radius: 0 8px 8px 0;
}
.tch-note p { margin: 0.4rem 0 !important; line-height: 1.7; }

[data-theme="dark"] .tch-lang-btn { background: #27272a; border-color: #3f3f46; color: #d4d4d8; }
[data-theme="dark"] .tch-lang-btn:hover { background: #3f3f46; }
[data-theme="dark"] .tch-m-2023 { --tch-bg: rgba(99, 102, 241, 0.12); }
[data-theme="dark"] .tch-m-2024 { --tch-bg: rgba(8, 145, 178, 0.12); }
[data-theme="dark"] .tch-m-2025 { --tch-bg: rgba(234, 88, 12, 0.12); }
[data-theme="dark"] .tch-m-2026 { --tch-bg: rgba(22, 163, 74, 0.12); }
[data-theme="dark"] .tch-note { background: rgba(22, 163, 74, 0.12); }
</style>

<div class="tch-lang-switcher not-prose">
<button class="tch-lang-btn tch-lang-active" data-switch-lang="en">English</button>
<button class="tch-lang-btn" data-switch-lang="ru">Русский</button>
</div>

<div class="tch-banner not-prose" data-lang="en">
  <p class="tch-title">Teaching ML in the Age of AI Agents</p>
  <p class="tch-subtitle">Three years, one age of students</p>
  <span class="tch-series">PART 1 / 3</span>
</div>

<div class="tch-banner not-prose lang-hidden" data-lang="ru">
  <p class="tch-title">Преподавание ML в эпоху AI-агентов</p>
  <p class="tch-subtitle">Три года, один возраст студентов</p>
  <span class="tch-series">ЧАСТЬ 1 / 3</span>
</div>

<div data-lang="en">

Starting a short series on teaching machine learning, with live examples from how today's students actually work.

I've always liked figuring out hard things and then explaining them to other people, which is basically what teaching is. Through my every degree and every job there's been some amount of teaching mixed in: olympiad math clubs, math seminars at a Physics-Mathematics School, a Python course at Computer Science Center. This semester I'm running two courses at Neapolis University Pafos: "Programming Paradigms" for first-years, and the second half of a machine learning course for second-years.

It's my third time through these courses, and a third pass is a good moment to look around. What jumps out most in 2026 is what AI has done to the room, on both sides of it.

## Three years, four snapshots

![AI, Coding, and Student Learning — a timeline](/posts/teaching-ml-with-ai/ai-coding-timeline.png)

<div class="tch-timeline not-prose">

<div class="tch-milestone tch-m-2023">
<p class="tch-milestone-date">March 2023</p>
<p>A little over three years ago, Cursor had just gone public. Models were weak. You could say with confidence that every student writing code was actually writing the code himself.</p>
</div>

<div class="tch-milestone tch-m-2024">
<p class="tch-milestone-date">May 2024</p>
<p>The frontier was GPT-4o, Claude 3 Opus, Gemini 1.5. Much stronger at concrete tasks, very nice in chat, but well below today on hard problems. Good code generators, not yet full programming agents. It's no exaggeration to say students were still honestly writing code themselves (and understanding it). Teachers also were still checking everything themselves :)</p>
</div>

<div class="tch-milestone tch-m-2025">
<p class="tch-milestone-date">Feb &ndash; May 2025</p>
<p>The turning point: Andrej Karpathy coined the term "vibe coding" in February. By May, student projects looked much more polished than the year before, but real understanding survived only in the most conscientious and reflective students. AI agents will happily work for you. They cannot think for you!</p>
</div>

<div class="tch-milestone tch-m-2026">
<p class="tch-milestone-date">Now &middot; May 2026</p>
<p>Things have evened out again, surprisingly. Methodical, self-aware students put real hours in, and with AI agents (which have become genuinely powerful tools) they produce good work. When you sit down with them to talk through the project, they can answer hard questions and defend the architectural decisions their agent implemented (and probably even proposed), but which they actually understood and chose to keep.</p>
</div>

</div>

## What a strong homework looks like now

One of this term's assignments was: build your own voice assistant (J.A.R.V.I.S, Just A Rather Very Intelligent System) that lives on your laptop. Here's roughly what one of the well-done versions did:

<div class="tch-spec not-prose">
<p class="tch-spec-head">// J.A.R.V.I.S build &mdash; selected spec</p>
<ul>
<li>Real wake-word detection via <code>openWakeWord</code> with a custom-trained <code>codi.onnx</code> model</li>
<li>LangGraph state machine with <code>SqliteSaver</code> checkpointing &mdash; dialogue survives restarts, thread isolation, tool-call loop protection (<code>MAX_TOOL_ITERATIONS</code> + <code>force_finalize</code> node)</li>
<li>MemGPT-style memory: small key&rarr;value core memory always in the system prompt, plus a Chroma vector store with multilingual fastembed embeddings for archival notes. Semantic deduplication on save (cosine similarity &ge; 0.9)</li>
<li>Running summary: once the buffer exceeds 16 messages, older turns are summarized into a state field; only the last 6 are kept verbatim</li>
<li>Follow-up window after each reply (7&nbsp;s) &mdash; no need to re-trigger the wake-word for natural multi-turn conversation</li>
<li>Background timers / reminders via <code>threading.Timer</code> that speak via Piper and trigger native macOS notifications. <code>dateparser</code> handles Russian natural-language</li>
<li>Anti-hallucination system prompt that explicitly forbids inventing memory contents and demands confirmation for destructive ops</li>
</ul>
</div>

## What this means for the teacher

<p>AI has been good for education, on balance. Students get to try and build far more in the same number of weeks. And teachers no longer have a choice about whether to check understanding through live conversation, because that's the only signal left worth trusting.</p>
<p>The other thing this forces, much more clearly than before, is the decision about which knowledge is important enough to stay in the student's head, and which they can confidently let an agent hold for them =)</p>

</div>

<div data-lang="ru" class="lang-hidden">

Начинаю небольшую серию постов об обучении машинному обучению (сорри!) с настоящими примерами из жизни наших студентов.

Сколько себя помню, я всегда любил разбираться в каких-то непростых вещах и потом объяснять их другим людям, то есть по сути дела, преподавать. Всегда совмещал свою учебу или работу с тем или иным количеством преподавания: кружки по олимпиадной математике, семинары по математике в ФМШ, потом курс по Питону в CS center. В этом полугодии у меня два курса в НУПе: "Парадигмы программирования" для первого года обучения и вторая часть курса по машинному обучению для второго.

Это уже третье прочтение курсов, поэтому можно немного порефлексировать. Прежде всего, конечно, на тему влияния ИИ на современных студентов и преподавателей.

## Три года, четыре зарисовки

![AI, Coding, and Student Learning — таймлайн](/posts/teaching-ml-with-ai/ai-coding-timeline.png)

<div class="tch-timeline not-prose">

<div class="tch-milestone tch-m-2023">
<p class="tch-milestone-date">Март 2023</p>
<p>Чуть больше трёх лет назад, в марте 2023, ещё только был публично запущен Cursor, модели были слабые, и с уверенностью можно утверждать, что все люди писали код своими руками.</p>
</div>

<div class="tch-milestone tch-m-2024">
<p class="tch-milestone-date">Май 2024</p>
<p>На фронтире уже были GPT-4o, Claude 3 Opus, Gemini 1.5 &mdash; намного более сильные модели в плане решения конкретных задач, которые уже очень классно работали в режиме чата, но их уровень был заметно ниже, чем сейчас, особенно на сложных задачах. Тогда модели были хорошими генераторами кода, но не были полноценными программистами-агентами. Не будет преувеличением написать, что студенты ещё честно писали код самостоятельно (хорошо понимая его, конечно), а преподаватели проверяли :)</p>
</div>

<div class="tch-milestone tch-m-2025">
<p class="tch-milestone-date">Февраль &ndash; май 2025</p>
<p>Переломный момент: в феврале 2025 Карпати вводит термин &laquo;vibe coding&raquo;, и в мае 2025 года проекты студентов уже были намного более качественными, но при этом понимание осталось только у очень сознательных и рефлексирующих студентов. AI агенты отлично работают за вас, но никак не могут за вас думать!</p>
</div>

<div class="tch-milestone tch-m-2026">
<p class="tch-milestone-date">Сейчас &middot; май 2026</p>
<p>Кажется, всё снова выровнялось &mdash; склонные к методичной работе, сознательные и рефлексирующие студенты вкладывают достаточно много времени в учебу, и с помощью AI агентов (ставших просто очень мощным инструментом) получают хорошие результаты. А при живом обсуждении проектов и материала могут спокойно ответить на непростые вопросы и обосновать те или иные архитектурные решения, реализованные (и вероятно даже принятые) агентом, но проверенные ими.</p>
</div>

</div>

## Как выглядит хорошо сделанная домашка

Вот пример одной из хорошо сделанных домашек, в которой нужно было реализовать своего голосового ассистента (J.A.R.V.I.S, Just A Rather Very Intelligent System), живущего в ноутбуке:

<div class="tch-spec not-prose">
<p class="tch-spec-head">// J.A.R.V.I.S build &mdash; selected spec</p>
<ul>
<li>Real wake-word detection via <code>openWakeWord</code> with a custom-trained <code>codi.onnx</code> model</li>
<li>LangGraph state machine with <code>SqliteSaver</code> checkpointing &mdash; dialogue survives restarts, thread isolation, tool-call loop protection (<code>MAX_TOOL_ITERATIONS</code> + <code>force_finalize</code> node)</li>
<li>MemGPT-style memory: small key&rarr;value core memory always in the system prompt, plus a Chroma vector store with multilingual fastembed embeddings for archival notes. Semantic deduplication on save (cosine similarity &ge; 0.9)</li>
<li>Running summary: once the buffer exceeds 16 messages, older turns are summarized into a state field; only the last 6 are kept verbatim</li>
<li>Follow-up window after each reply (7&nbsp;s) &mdash; no need to re-trigger the wake-word for natural multi-turn conversation</li>
<li>Background timers / reminders via <code>threading.Timer</code> that speak via Piper and trigger native macOS notifications. <code>dateparser</code> handles Russian natural-language</li>
<li>Anti-hallucination system prompt that explicitly forbids inventing memory contents and demands confirmation for destructive ops</li>
</ul>
</div>

## Что это значит для преподавателя

<p>В итоге получается, что ИИ позитивно влияет на наше образование &mdash; студенты могут больше всего сделать и попробовать за то же время, а преподаватели теперь уже точно должны проверять знания, оставшиеся в головах студентов, через живое обсуждение проектов и материала.</p>
<p>И, конечно, ещё четче выделять, а какие именно знания настолько важны, чтобы оставаться в головах =)</p>

</div>

<script>
(function() {
  var titles = {
    en: 'Teaching ML in the Age of AI Agents (1/3)',
    ru: 'Преподавание ML в эпоху AI-агентов (1/3)'
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
