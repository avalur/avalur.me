---
title: "The Matrix Has You: Hacking CTF with AI"
description: "My first-ever CTF competition experience, where AI agents transformed a complete beginner into a competitive hacker."
date: 2026-02-02
tags: ["CTF", "AI Agents", "Cybersecurity"]
readingTime: "9 min"
---

I'd never done cybersecurity before, but I jumped into a CTF where using AI was allowed -- and it turned out to be insanely fun, though pretty expensive. Below I share what I learned: how the agents carried challenge after challenge, why you sometimes need multiple models, and whether my original "we'll solve everything on day one" plan actually worked.

![First time meme](/posts/AI_and_JB_CTF/first_time_mem.png)

## Introduction

Computer-based competitions can generally be divided into three groups. Besides esports, which I know very little about and which heavily depend on the specific game, there are:

1. **Competitive programming:** In the ICPC finals, teams of 3 solve 12 algorithmic problems over 5 hours -- you need to write code that produces correct answers on tests within given time and memory constraints. Usually these involve variations on brain-crushing algorithms, like suffix trees or similar structures. This type of competition is also closest to classical math olympiads, which is why strong students often transition from mathematics to competitive programming.
2. **Machine learning competitions:** The main reference here is [Kaggle](https://www.kaggle.com/), where companies bring data and problems that've run for several months. Typically, you need to achieve the maximum value on a given metric, sometimes with constraints on time and computational resources used for training and inference.
3. **Cybersecurity:** There's also the International CyberSecurity Challenge, a team championship between countries, and the prestigious DEF CON CTF (Capture The Flag), where "hacker" teams defend their flags while writing attacks to steal other teams' flags.

In ICPC, the rules prohibit AI usage, which is understandable -- this summer GPT-5 already successfully solved all 12 problems, while the best human team could only submit 11.

In machine learning, models are actively used, of course, but for long multi-day competitions this is less relevant for now, as humans still perform quite well.

So what about cybersecurity competitions? As usual, I decided to test this through personal experience and participate in JetBrains' internal championship. I'll honestly repeat that this was my first such experience ever, and before this I had never been interested in cybersecurity -- only mathematics and machine learning.

![Hacker newbie](/posts/AI_and_JB_CTF/hacker_newbee.png)

## My Setup and First Results

Obviously, you can't become a cybersecurity expert in just a few days.

![First day in cybersecurity](/posts/AI_and_JB_CTF/first_day_cybersec.png)

That's why one of my main goals was testing Claude Code + Opus 4.5 and other models on interesting and challenging tasks. Vulnerability hunting seems like a fairly natural environment for a code agent -- it needs to write scripts, send network requests, analyze responses, and notice anomalies that reveal vulnerabilities to exploit. As it turned out, it was important that I had unlimited Claude Code =)

It performed incredibly well! Practically all solutions were found by Claude. Here's our progress chart (see orange AlexA):

![Competition progress](/posts/AI_and_JB_CTF/comp_progress.png)
*Competition progress chart*

Initially, I simply launched four parallel instances of Claude Code + Opus 4.5 in iTerm so they could solve tasks faster. In the end, within the first 4 hours we solved 16 out of 31 tasks from the first prompt, which was a great result and even gave us a confident first place on the leaderboard =)

![Temporary first place](/posts/AI_and_JB_CTF/temporary_first_place.png)
*Temporary first place on the leaderboard*

After such a start, it was hard to stop. The next day Claude and I continued and completed about 10 more tasks. The ones Claude couldn't solve were handled by Junie, and then a couple more by the Codex agent with gpt-5.2-codex model and maximum limits, which appeared in PyCharm right during the second day of the competition =)

So by the weekend, only two "Hard" level tasks remained -- one about breaking a system of multiple AI chatbots, and another about unsafe memory access from a Java application. They just wouldn't yield -- even five-hour terminal sessions produced no results and kept going in circles.

Since I know a bit about machine learning, I decided to first tackle bypassing AI chatbot defenses, guiding Claude Code as much as possible about what variants and vulnerabilities might exist in principle. The funniest thing is that the flag was ultimately found by Codex, which was just working on its own and found the solution.

![Two buttons meme](/posts/AI_and_JB_CTF/two_buttons_meme.jpg)

As usual, once you know the answer, the solution seems simple and obvious. The AI validator simply detected forbidden substrings in direct output. So if you request hexadecimal bytes, the model never outputs the forbidden string unchanged, and the validator allows the response. This way we could decode the entire string locally and find the flag!

After this, I noted to myself once again that you need different models (though sometimes just restarting Claude Code also helped, of course), and immediately went to pay for a Gemini 3 token -- based on [my summer experiments](https://avalur.me/posts/alphago-moment-for-maths) with olympiad math problems, I thought it would be good. In reality, it turned out that it also couldn't solve the remaining hard tasks.

## Final Thoughts

- It's actually very fun to interact with a brilliant model in an area where you yourself understand almost nothing, while the competitive effect drives you forward and keeps you going! I can't even remember when I last stayed up so late trying to solve all the tasks =)
- For now, this is not a cheap pleasure -- about \$2000 went to Claude Code tokens, another \$50 to Gemini 3, and around \$300 to Codex. Most likely in the future tokens will be cheaper and models even smarter.
- It's interesting to watch agents work -- they tirelessly do everything to achieve the set goal, while trying their best to account for your prompt.
- Models are still not omnipotent and can get stuck going in circles endlessly. In fact, two CTF tasks remained, even such clearly defined and olympiad-style ones, that agents couldn't solve even in a day or two with no token limit.
