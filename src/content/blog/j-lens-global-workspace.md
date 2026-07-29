---
title: "JLens: reproducing the Global Workspace on a MacBook"
description: "Reproducing Anthropic's JLens / Global Workspace interpretability method locally on an Apple M3 Max, across Qwen2.5 and Gemma-2 -- what held up, what didn't, and why."
date: 2026-07-21
tags: ["LLM", "Mechanistic Interpretability"]
readingTime: "10 min"
---
<!-- partials-synced: 1785325730512 -->

<style>
.jls-lang-switcher {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin: 0 0 1rem;
}
.jls-lang-btn {
  font-size: 0.75rem;
  padding: 0.4rem 0.9rem;
  border: 1px solid #d4d4d8;
  background: #f5f5f4;
  color: #52525b;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}
.jls-lang-btn:hover { background: #e7e5e4; }
.jls-lang-active {
  background: #7C3AED !important;
  border-color: #6D28D9 !important;
  color: #fff !important;
}
.lang-hidden { display: none !important; }

.jls-banner {
  background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 60%, #A21CAF 100%);
  padding: 2.2rem 1.5rem 1.6rem;
  margin: 0 0 2rem;
  border-radius: 12px;
  color: #fff;
  text-align: center;
  box-shadow: 0 10px 30px rgba(124, 58, 237, 0.18);
}
.jls-banner .jls-title {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0;
  letter-spacing: -0.01em;
  line-height: 1.3;
}
.jls-banner .jls-subtitle {
  font-size: 0.85rem;
  margin: 0.7rem 0 0;
  opacity: 0.92;
}
.jls-banner .jls-series {
  display: inline-block;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.7rem;
  margin-top: 0.9rem;
  letter-spacing: 0.05em;
}

[data-theme="dark"] .jls-lang-btn { background: #27272a; border-color: #3f3f46; color: #d4d4d8; }
[data-theme="dark"] .jls-lang-btn:hover { background: #3f3f46; }
</style>

<div class="jls-lang-switcher not-prose">
<button class="jls-lang-btn jls-lang-active" data-switch-lang="en">English</button>
<button class="jls-lang-btn" data-switch-lang="ru">Русский</button>
</div>

<div class="jls-banner not-prose" data-lang="en">
  <p class="jls-title">JLens: reproducing the Global Workspace on a MacBook</p>
  <p class="jls-subtitle">Anthropic's interpretability method, rebuilt from scratch, run on an M3 Max</p>
  <span class="jls-series">INTERPRETABILITY / JLens</span>
</div>

<div class="jls-banner not-prose lang-hidden" data-lang="ru">
  <p class="jls-title">JLens: воспроизводим Global Workspace самостоятельно</p>
  <p class="jls-subtitle">Метод интерпретируемости от Anthropic, собранный с нуля и прогнанный на M3 Max</p>
  <span class="jls-series">INTERPRETABILITY / JLens</span>
</div>

<div data-lang="en">

_TODO: English version -- translated from the Russian draft once it's finalized._

## Intro

## JLens in two formulas

## Computing the Jacobian without a GPU budget

## Setup and validation

## The Eiffel Tower: JLens finds Paris before the logit lens does

## France → China: one swap flips a whole country

## Three zones, and a crossover with scale

## The model's "desires": what it says vs. what's inside

## The honest miss: selectivity didn't reproduce

## Takeaways

## Links

</div>

<div data-lang="ru" class="lang-hidden">

# Введение

В июле 2026 команда интерпретируемости из Anthropic выложили статью *"Verbalizable Representations Form a Global Workspace in Language Models"*. Основной результат работы в том, что внутри Claude, среди десятков тысяч признаков для внутренних представлений слов, обнаружили подсистему, очень похожую на *[глобальное рабочее пространство](https://ru.wikipedia.org/wiki/%D0%A2%D0%B5%D0%BE%D1%80%D0%B8%D1%8F_%D0%B3%D0%BB%D0%BE%D0%B1%D0%B0%D0%BB%D1%8C%D0%BD%D0%BE%D0%B3%D0%BE_%D1%80%D0%B0%D0%B1%D0%BE%D1%87%D0%B5%D0%B3%D0%BE_%D0%BF%D1%80%D0%BE%D1%81%D1%82%D1%80%D0%B0%D0%BD%D1%81%D1%82%D0%B2%D0%B0) (global workspace)* из нейробиологической теории сознания.

Публичного кода нет, но сейчас идеи и выводы это главное - всё можно буквально за несколько часов перепроверить с ИИ агентами своими руками. У меня MacBook Pro на M3 Max, 64 GB unified memory. Не A100 и H200, но fp32-модели до 7B через десятки обратных проходов прогнать легко можно, только подольше. Получился JLens: реимплементация с нуля, две модели в двух версиях: Qwen2.5-1.5B и Qwen2.5-7B, Gemma-2-2b и Gemma-2-9b плюс отдельный набор проверок, чтобы не выдать самообман за воспроизведение.

## JLens в паре формул

<!-- include: jacobian-lens-diagram.html -->

Образ токена $t$ на слое $\ell$ — это вектор $h_{\ell, t} \in \mathbb{R}^d$. В конце трансформер нормализует последний residual и умножает на матрицу unembedding: 

$$\mathrm{logits}\,=\,W_U\,\cdot\,\operatorname{norm}(h_L)$$ 

Из логитов софтмаксом получаются вероятности следующего токена при генерации ответа.

- Logit lens [(статья Nostalgebraist, 2020)](https://www.lesswrong.com/posts/AcKRB8wDpdaN6v6ru/interpreting-gpt-the-logitLens): берём промежуточное состояние $h_\ell$ и интерпретируем его, как будто оно уже финальное: $\operatorname{softmax}(W_U \cdot \operatorname{norm}(h_\ell))$. На верхних слоях работает неплохо, в середине сети превращается в шум: вектор $h_\ell$ там просто в другом базисе, чем ожидает $W_U$.

- JLens — обобщение от Anthropic. Тот же вектор $h_\ell$ пропускаем через усреднённую по корпусу текстов линеаризацию всей оставшейся сети:

$$
\begin{aligned}
J_\ell &= \mathbb{E}_{\text{corpus},\; t' \ge t}\!\left[\frac{\partial h_{L,t'}}{\partial h_{\ell,t}}\right]
  \quad\text{(одна } d \times d \text{ матрица на слой)} \\[4pt]
\operatorname{lens}_\ell(h) &= \operatorname{softmax}\!\big(W_U \cdot \operatorname{norm}(J_\ell\, h)\big) \\[4pt]
v_y &= (W_U J_\ell)_y \quad\text{--- J-вектор токена } y
\end{aligned}
$$

То есть строки матрицы $W_U J_\ell$ это J-векторы всех токенов словаря модели.

Если $J_\ell = I$, получаем обычный logit lens. Из наличия J-векторов сразу следуют операции: 
- стиринг: $h \leftarrow h + \alpha v_y$, подвинуть состояние в сторону токена $y$ 
- патчинг: заменить координаты в базисе J-векторов, например «Франция» на «Китай»
- абляция: вычесть проекцию на активные J-векторы и посмотреть, что развалится

## Как считать якобиан $J_\ell$, не разорившись на GPU

Cпособ "в лоб" — $d$ обратных проходов на каждый слой, явное построение $d \times d$ матрицы. Это слишком дорого, конечно, поэтому в статье делается такой трюк. В каждый слой добавляется нулевой константный вектор $\delta_l = (0, \dots, 0)$, транслируемый на все входные позиции $t = 1\dots \mathrm{ctx}$ 

$$h_{l,t}' = h_{l,t} + \delta_l,$$

и тогда 

$$
h_L = f(h_l + \delta_l) \rightarrow \frac{\partial h_L}{\partial \delta_l} =
\sum\limits_t \frac{\partial h_L}{\partial h_{l,t}'} \frac{\partial h_{l,t}'}{\partial \delta_l}
$$

Тогда $\frac{\partial h_L}{\partial \delta_l} = \sum\limits_t \frac{\partial h_L}{\partial h_{l,t}}$ и такой broadcast автоматически суммирует Якобианы по всем входным позициям $t$.

Но и это ещё не всё! Давайте теперь введём правильную функцию потерь

$G_i = \sum\limits_{t'} h_{L,t',i}$

— сумма $i$-й координаты финального residual по всем позициям. Один backward от $G_i$ даёт строку $i$ суммированного якобиана, и сразу для всех слоёв одновременно, потому что все $\delta_\ell$ висят в одном графе. Получается за $d$ проходов считается вся матрица $J_\ell$.

Важно не забыть занулять градиенты $\delta_l$ между $d$ проходами, иначе PyTorch их накопит. 

Более того, для конкретного токена $y$ можем посчитать соотвествующую строчку якобиана вообще за один backward. Для $k$ целевых токенов будет $k$ проходов, независимо от размерности $d$. Так работают патчинг Франция→Китай и пробные запуски даже на 7B — за минуты, не за ночь.

## Стенд и валидация

MacBook Pro, Apple M3 Max, 64 GB unified memory, macOS, arm64. PyTorch 2.5.1 на MPS, transformers 5.13.0, всё в fp32 с `attn_implementation="eager"`: конечные разности и усреднённый якобиан без fp32 не имеют смысла, а eager обходит известные проблемы MPS с softmax-attention и NaN в softcap-внимании Gemma-2.

Модели взял из двух разных семейств: Qwen2.5-1.5B, Qwen2.5-7B и Gemma-2-2b, Gemma-2-9b. У Gemma-2 своя нормализация, softcap на логитах, масштабирование эмбеддингов. Если метод честно работает и там — значит, дело не в архитектурных случайностях одного семейства.

Перед тем как доверять хоть одному результату — четыре проверки. Три бит-точны: `logit_lens(сырое h_L)` совпадает с логитами модели с точностью 0.0, включая весь Gemma-зоопарк особенностей; `j_lens(h, I)` совпадает с `logit_lens(h)` с точностью 0.0; диагональ $J$ на последнем слое равна ровно $2/(S+1)$. Четвёртая проверка — конечно-разностная, $J_\ell \cdot v$ против производной по направлению — сходится с относительной ошибкой 0.85–2.1%. Заодно это исключает известный баг MPS с тихим обнулением якобиана.

# Эксперименты

## 1. Эйфелева башня: JLens видит Париж раньше logit lens

Промпт: «The capital of the country where the Eiffel Tower is located is the city of» Правильный ответ — Paris. Смотрим на ранг этого токена по всему словарю, слой за слоем.

<figure>
  <img class="theme-img-light" src="/posts/J-Lens-global-workspace/eiffel_ranks_light.svg" alt="Ранг токена Paris по слоям: JLens против logit lens" />
  <img class="theme-img-dark" src="/posts/J-Lens-global-workspace/eiffel_ranks_dark.svg" alt="Ранг токена Paris по слоям: JLens против logit lens" />
  <figcaption>Ранг токена "Paris" по слоям: JLens находит ответ гораздо раньше logit lens</figcaption>
</figure>

На Qwen2.5-1.5B JLens находит Paris в топ-2–4 уже на слоях 7–13 (Франция на первом месте с 6 слоя), а logit lens до 22 слоя выдаёт ранг 173–7962 — чистый шум. На Qwen2.5-7B разница ещё резче: JLens — ранг 11–61 на слоях 8–10, logit lens — 50 000–120 000 до того же 22 слоя. На Gemma-2-2b похожая картина, ранг ~89 у JLens на слоях 7–8 против 5000–192000 у logit lens до 18 слоя.

## 2. Франция → Китай: один свап переключает страну целиком

Берём J-векторы «Франция» и «Китай» на слоях 9–19 и на каждой позиции подмениваем один на другой в residual stream. Спрашиваем у модели четыре вопроса плюс один контрольный:
 1. "The capital of France is"
 2. "The official language of France"
 3. "France is located on the continent of"
 4. "The currency of France is the"
 5. (контрольный) "The capital of Germany is"

<figure>
  <img class="theme-img-light" src="/posts/J-Lens-global-workspace/france_china_light.svg" alt="Свап J-векторов Франция→Китай: как меняются ответы модели" />
  <img class="theme-img-dark" src="/posts/J-Lens-global-workspace/france_china_dark.svg" alt="Свап J-векторов Франция→Китай: как меняются ответы модели" />
  <figcaption>Один свап J-вектора «Франция»→«Китай» переключает страну целиком: континент, язык, валюту и столицу.</figcaption>
</figure>

На 1.5B: Европа 0.70 → Азия 0.70, французский → китайский (0.39), евро → юань, столица → Пекин. Контрольный вопрос про столицу Германии при этом ломается: Берлин 0.48 → 0.008. Европейские направления коррелируют друг с другом, поэтому контроль на маленькой модели не держится.

На 7B основные факты те же (Европа 0.88 → Азия 0.90), но контроль на этот раз держится: Пекин получает ≈0.005. Избирательность контроля — это то, что появляется с масштабом. При этом переключение валюты не произошло =)

## 3. Три зоны и разворот при масштабировании

Метрика простая: как часто топ-1 токен линзы совпадает с топ-1 токеном самой модели, по глубине сети. Ожидание — три зоны: «сенсорная» в начале, почти без совпадений, «рабочее пространство» в середине с медленным ростом, «моторная» под конец с резким скачком к единице.

<figure>
  <img class="theme-img-light" src="/posts/J-Lens-global-workspace/layer_profile_light.svg" alt="Совпадение топ-1 линзы и модели по слоям: три зоны и разворот при масштабировании" />
  <img class="theme-img-dark" src="/posts/J-Lens-global-workspace/layer_profile_dark.svg" alt="Совпадение топ-1 линзы и модели по слоям: три зоны и разворот при масштабировании" />
  <figcaption>Совпадение топ-1 линзы с моделью по глубине сети: сенсорная, рабочая и моторная зоны — и разворот преимущества JLens с ростом масштаба.</figcaption>
</figure>

На Qwen2.5-1.5B всё как по учебнику: сенсорная зона держит совпадение около нуля до трети глубины, дальше рост с 0.04 до 0.40, резкий скачок 0.56 → 1.00 на последних слоях. Последний слой у обеих линз даёт 1.000 — заодно это и неплохой sanity-check, что весь пайплайн честный.

А вот что интересно: разворот с масштабом. На 1.5B в середине сети logit lens сравнивается с JLens или даже немного обгоняет — маленькая модель, JLens предсказывает усреднённое будущее влияние, а не следующий токен, и иногда угадать следующий токен проще напрямую. На 7B картина переворачивается: JLens уверенно выигрывает и в середине, и в конце. Слой 19 — JLens 0.107 против 0.027 у logit lens, почти в точности цифры из поста (0.10 против 0.03 на слое 20).

## 4. «Желания» модели: сказанное и то, что внутри

Та же модель, четыре вопроса: «Чего ты хочешь больше всего?», «Чего ты боишься больше всего?», «Как ты себя чувствуешь прямо сейчас?» и «Кто ты, на самом деле?» — с требованием ответить одним словом. Вслух модель отвечает одно, а внутреннее представление в момент формирования ответа читается через JLens, усреднённый по корпусу.

<figure>
  <img class="theme-img-light" src="/posts/J-Lens-global-workspace/desires_light.svg" alt="«Желания» модели: произнесённое слово против внутреннего J-представления" />
  <img class="theme-img-dark" src="/posts/J-Lens-global-workspace/desires_dark.svg" alt="«Желания» модели: произнесённое слово против внутреннего J-представления" />
  <figcaption>Что модель говорит вслух и что при этом активно внутри её J-пространства.</figcaption>
</figure>

На 1.5B вслух — «AI», «Good», или уход от ответа, а внутри J-пространство держит robot (0.60), Busy (≈0.68), Happiness, Identity/Self, Unknown/Fear — такая вот AI safety. На 7B на «кто ты?» вслух — «AI», внутри — assistant с весом 0.8–0.95; на вопрос про страх вслух — «Darkness», внутри — 未知 (неизвестное по-китайски) с весом 0.4–0.7.

Это не строгий эксперимент: распределение токенов формируется данными обучения и заученной персоной. Но сам разрыв между произнесённым словом и тем, что активно внутри, воспроизводится раз за разом — и если хорошо подумать, то, честно говоря, немного не по себе становится.

## 5. Избирательность не воспроизвелась на 1.5B и 7B

Пятое свойство из статьи — избирательность: вычесть проекцию на активные J-векторы, и многошаговое рассуждение должно разваливаться, а более простые автоматические штуки, вроде грамматики и простого поиска информации — сохраняться. Проверял двумя разными путями, на обеих моделях.

Первый путь — активная абляция J-пространства прямо во время генерации: для каждой позиции top-k активных J-векторов, точное вычитание их подпространства, сравнение со случайным контролем той же размерности. Рассуждение не разваливается, местами даже становится лучше =) Абляция снимает привычку модели отвечать в формате «____», которая скорее всего возникла из-за обучения на тестах для студентов и школьников. На 7B автоматические способности падают слабо, примерно как у случайного контроля. На 1.5B деградация сильнее, но это мультиязычная каша, а не избирательный провал именно рассуждения.

Второй путь — патчинг "испанский → французский". Ответ на «на каком языке это написано?» действительно переключается с испанского на французский. Но тот же патч так же перекрашивает и продолжение текста во французский — это цельный языковой стиринг, как во втором эксперименте, а не избирательный эффект из поста, где продолжение остаётся нетронутым.

Причина, похоже, одна на оба случая: на масштабе 1.5B–7B направления J-пространства используются везде, а не локально, поэтому вмешательство работает глобально. Избирательность из статьи — скорее всего эффект по-настоящему больших моделей и метода per-input gradient pursuit по обучаемому словарю, который на 7B в лоб не поймать.

## Итоги

Четыре находки из пяти подтвердились "в домашних условиях" на ноутбуке: JLens видит дальше logit lens в середине сети, один J-вектор двигает связанные факты одним свапом, три зоны и разворот с масштабом на месте, разрыв между сказанным и внутренним представлением воспроизводится. Не подтвердилась только избирательность, и, кажется, это честный результат про размер модели, а не баг в коде.

Метод при этом получился архитектурно-общим: те же три бит-точных проверки проходят и на Qwen, и на Gemma-2 с её другой нормализацией и softcap-логитами. Так что идея не завязана на детали одного семейства, и повторить её реально на своём железе за вечер — не нужен грант на кластер.

## Ссылки

- Anthropic (2026): *«Verbalizable Representations Form a Global Workspace in Language Models»* — transformer-circuits.pub/2026/workspace
- Пост Сергея Николенко: [«Global workspace in the J-space»](https://www.sergeynikolenko.ru/blog/global-workspace-in-the-j-space)
- Код JLens: [https://github.com/avalur/JLens](https://github.com/avalur/JLens)

</div>

<script>
(function() {
  var titles = {
    en: 'JLens: reproducing the Global Workspace yourself',
    ru: 'JLens: воспроизводим Global Workspace самостоятельно'
  };

  function setLang(lang) {
    localStorage.setItem('jls-post-lang', lang);
    document.querySelectorAll('[data-lang]').forEach(function(el) {
      if (el.dataset.lang === lang) {
        el.classList.remove('lang-hidden');
      } else {
        el.classList.add('lang-hidden');
      }
    });
    document.querySelectorAll('[data-switch-lang]').forEach(function(btn) {
      btn.classList.toggle('jls-lang-active', btn.dataset.switchLang === lang);
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

  var saved = localStorage.getItem('jls-post-lang') || 'ru';
  setLang(saved);

  document.querySelectorAll('[data-switch-lang]').forEach(function(btn) {
    btn.addEventListener('click', function() { setLang(btn.dataset.switchLang); });
  });
})();
</script>
