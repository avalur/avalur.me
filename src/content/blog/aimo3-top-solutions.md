---
title: "AIMO3: Reading the Top Solutions"
description: "Notes on the top-three writeups from the AI Mathematical Olympiad Progress Prize 3 — where, with open models and equal compute, the contest turned into an engineering one."
date: 2026-06-05
tags: ["LLM", "Math", "Kaggle", "AIMO"]
readingTime: "6 min"
---

<style>
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&display=swap');

.tch-banner {
  background: linear-gradient(135deg, #0F766E 0%, #4F46E5 55%, #7C3AED 100%);
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
  border-left: 4px solid #0F766E;
  background: rgba(15, 118, 110, 0.06);
  padding: 1rem 1.2rem;
  margin: 1.5rem 0;
  border-radius: 0 8px 8px 0;
}
.tch-note p { margin: 0.4rem 0 !important; line-height: 1.7; }

[data-theme="dark"] .tch-lang-btn { background: #27272a; border-color: #3f3f46; color: #d4d4d8; }
[data-theme="dark"] .tch-lang-btn:hover { background: #3f3f46; }
[data-theme="dark"] .tch-note { background: rgba(15, 118, 110, 0.14); }
[data-theme="dark"] .tch-pullquote { background: rgba(124, 58, 237, 0.14); color: #e9d5ff; }
</style>

<div class="tch-lang-switcher not-prose">
<button class="tch-lang-btn tch-lang-active" data-switch-lang="en">English</button>
<button class="tch-lang-btn" data-switch-lang="ru">Русский</button>
</div>

<div class="tch-banner not-prose" data-lang="en">
  <p class="tch-title">AIMO3: Reading the Top Solutions</p>
  <p class="tch-subtitle">Open models, equal compute — so the contest became an engineering one</p>
  <span class="tch-series">KAGGLE / AIMO3</span>
</div>

<div class="tch-banner not-prose lang-hidden" data-lang="ru">
  <p class="tch-title">AIMO3: читаем решения призёров</p>
  <p class="tch-subtitle">Открытые модели, одинаковые мощности — и снова инженеры в топе Кагла</p>
  <span class="tch-series">KAGGLE / AIMO3</span>
</div>

<div data-lang="en">

The writeups for AIMO3 are out — the Kaggle competition about building a system that solves olympiad math at the level of the international olympiad, using open-source models only. I read the top three and want to share what stood out.

Kaggle usually has a familiar shape: everyone works with more or less the same open models and the same public papers. This time the compute was equalized on top of that — a lot of it, 5 hours of H100s compute per submission per day, but the cap the same for everyone. So the real game wasn't "who has the better model." It was engineering.

The winner says this directly:

<div class="tch-pullquote not-prose">
<p>"A major observation was that inference engineering itself became a competitive advantage. The final system behaved less like a traditional language model and more like a coordinated reasoning engine."</p>
</div>

As with agents, the model stops being the protagonist, and all the machinery around it takes over.

## The second place: the one I'd hand to a student

The second-place writeup is the one I'd give to someone who wants to actually learn something. Every change is spelled out, and you can watch the reasoning stack up.

Improvements 1 and 2 are both about the system prompt — wording the instructions so the model behaves the way you want.

Improvement 3 is my favorite, because it's small and the intuition is obvious once you see it: weight the tokens right before the answer more heavily. Their explanation:

<div class="tch-pullquote not-prose">
<p>"Improvement 3: Tail-Windowed Entropy. Both my version and base notebook use logprob entropy to measure how 'confident' a completion was, for use in the ensemble. But there's an important difference in what entropy is measured over. Parthenos (public): averages entropy over the full token stream. Mine: averages entropy only over the last 256 tokens (logprob_tail = 256)."</p>
</div>

Improvements 4 through 6 are smaller plumbing: more robust parsing of the answer, and a slightly different rule for which answer the ensemble finally commits to.

Improvement 7 adds an even earlier stop. If the current best answer can no longer change no matter what comes next, there's no reason to keep generating. Stop and save the compute.

## The third place: betting everything on the prompt

Third place went the other way and put all its weight on the system prompt. The trick I liked: they built a small dataset — 60 hard problems, with correct and incorrect solutions from gpt-oss-120b — and then had a bigger, smarter model read the weaker model's mistakes and suggest prompt fixes to steer it. A strong model tutoring a weaker one, but only through the prompt, never touching the weights.

<div class="tch-note not-prose">
<p>What stays with me from all three is that none of the wins came from a secret model. They came from how the same open model was driven: where to spend tokens, when to stop, how to read its own confidence, and what to put in the prompt. The intelligence was on the table for everyone. The leverage was in the engineering.</p>
</div>

## Conclusion

Did it solve the original problem — did it bring open models closer to the frontier ones on hard math? In my view, no. The winners wrote engineering wrappers around gpt-oss-120b and solved 44 of 50 problems each. At first glance that doesn't look bad, but if you follow third place's framing and assume that of the 50 problems 35 are easy, 10 are medium, and 5 are real killers, then the winners most likely failed exactly on the killers — while the best frontier-lab models surely solve all of them.

## Sources

- [1st place solution for the AIMO3 competition](https://www.kaggle.com/competitions/ai-mathematical-olympiad-progress-prize-3/writeups/1st-place-solution-for-the-aimo3-competition)
- [2nd place solution](https://www.kaggle.com/competitions/ai-mathematical-olympiad-progress-prize-3/writeups/2nd-place-solution-ai-mathematical-olympiad-prog)
- [3rd place solution for the AIMO3 competition](https://www.kaggle.com/competitions/ai-mathematical-olympiad-progress-prize-3/writeups/3rd-place-solution-for-the-aimo3-competition)

</div>

<div data-lang="ru" class="lang-hidden">

Недавно появились разборы решений AIMO3 — соревнования на Kaggle про построение системы, которая решает олимпиадную математику уровня межнара, используя только открытые модели. Прочитал тройку лидеров и делюсь тем, что зацепило.

На Kaggle обычно картина знакомая: у всех есть одни и те же открытые модели и одни и те же публичные статьи. В этот раз ещё и уравняли вычислительные мощности — их было очень много, на одну посылку в день 5 часов compute на H100-ых, но потолок одинаковый для всех. Так что игра шла не про то, "у кого модель лучше". Она шла про инженерию.

Победитель говорит об этом прямо:

<div class="tch-pullquote not-prose">
<p>"A major observation was that inference engineering itself became a competitive advantage. The final system behaved less like a traditional language model and more like a coordinated reasoning engine."</p>
</div>

Как и в агентах, модель перестаёт быть главным героем, и на первый план выходит вся машинерия вокруг неё.

## Второе место: разбор, который я бы дал студенту

Разбор со второго места — это тот текст, который я бы рекомендовал любому, кто хочет реально чему-то научиться. Каждое улучшение проговорено, и видно, как логика выстраивается шаг за шагом.

Улучшения 1 и 2 — оба про системный промпт: как сформулировать инструкции, чтобы модель вела себя так, как нужно.

Улучшение 3 — моё любимое, потому что оно простое, а интуиция за ним очевидна, как только её прочитаешь: давать больший вес последним токенам прямо перед финальным ответом, а не всему ответу модели.

<div class="tch-pullquote not-prose">
<p>"Improvement 3: Tail-Windowed Entropy. Both my version and base notebook use logprob entropy to measure how 'confident' a completion was, for use in the ensemble. But there's an important difference in what entropy is measured over. <br><br>Parthenos (public): averages entropy over the full token stream. <br>Mine: averages entropy only over the last 256 tokens (logprob_tail = 256)."</p>
</div>

Улучшения с 4 по 6 — это уже мелкие доработки: более надёжный парсинг ответа и слегка изменённое правило, какой ответ ансамбль в итоге выбирает финальным.

Улучшение 7 добавляет ещё более раннюю остановку. Если текущий лучший ответ уже точно не изменится, что бы ни сгенерировалось дальше, то и продолжать незачем — остановиться и сэкономить вычисления.

## Третье место: ставка целиком на промпт

Третье место пошло другим путём и поставило всё на системный промпт. Приём, который мне понравился: автор собрал относительно небольшой датасет, 60 сложных задач с правильными и неправильными решениями от gpt-oss-120b, и дал более крупной и умной модели читать ошибки слабой и предлагать правки промпта, чтобы её направлять. Сильная модель как бы натаскивает слабую, но только через промпт, не трогая веса.

<div class="tch-note not-prose">
<p>What stays with me from all three is that none of the wins came from a secret model. They came from how the same open model was driven: where to spend tokens, when to stop, how to read its own confidence, and what to put in the prompt. The intelligence was on the table for everyone. The leverage was in the engineering.</p>
</div>

## Заключение
Получилось ли решить изначальную задачу и приблизить открытые модели к фронтирным в решении сложных задач по математике? На мой взгляд, нет. Победители написали инженерные обёртки над gpt-oss-120b и решили по 44 задачи из 50. На первый взгляд кажется не так плохо, но если вслед за третьим местом предположить, что из 50 задач 35 вообще легко решаются, 10 средней сложности и 5 самых гробов - то скорее всего победители как раз гробы и не смогли сделать, а лучшие модели фронтирных лаб точно решают всё.

## Источники

- [1st place solution for the AIMO3 competition](https://www.kaggle.com/competitions/ai-mathematical-olympiad-progress-prize-3/writeups/1st-place-solution-for-the-aimo3-competition)
- [2nd place solution](https://www.kaggle.com/competitions/ai-mathematical-olympiad-progress-prize-3/writeups/2nd-place-solution-ai-mathematical-olympiad-prog)
- [3rd place solution for the AIMO3 competition](https://www.kaggle.com/competitions/ai-mathematical-olympiad-progress-prize-3/writeups/3rd-place-solution-for-the-aimo3-competition)

</div>

<script>
(function() {
  var titles = {
    en: 'AIMO3: Reading the Top Solutions',
    ru: 'AIMO3: читаем решения призёров'
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
