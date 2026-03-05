---
title: "Some Simple Economics of AGI"
description: "Paper review: why the binding constraint on growth shifts from intelligence to human verification bandwidth."
date: 2026-03-04
tags: ["AGI", "Economics", "AI Safety"]
readingTime: "12 min"
---

## Introduction

In February 2026, Christian Catalini (MIT), Xiang Hui (WashU), and Jane Wu (UCLA) published ["Some Simple Economics of AGI"](https://arxiv.org/abs/2602.20946) -- a paper that frames the economic impact of AGI not as a question of *what machines can do*, but of *what humans can verify*.

The central thesis is striking: as AI decouples cognition from biology, the marginal cost of execution approaches zero. But the fundamental constraint shifts to **human verification bandwidth** -- society's scarce capacity to validate outcomes, audit behavior, and underwrite meaning when execution becomes abundant.

> "Science gathers knowledge faster than society gathers wisdom." -- Isaac Asimov

![Paper summary](/posts/economics-of-agi/summary.jpg)
*Source: [Grigory Sapunov's Substack](https://arxiviq.substack.com/p/some-simple-economics-of-agi)*

## The Racing Cost Curves

The paper's core model rests on two cost curves racing in opposite directions:

- **Cost to Automate ($c_a$)** -- exponentially decaying, driven by compute scaling and accumulated knowledge
- **Cost to Verify ($c_h$)** -- biologically bottlenecked, constrained by human time and embodied experience

This asymmetry creates the core economic dynamic of the AGI transition. Unlike compute, human time cannot be easily replicated, parallelized, or transferred. The cheaper automation becomes, the more critical -- and relatively scarce -- human verification capacity grows.

## The Measurability Gap

The authors introduce the **Measurability Gap** ($\Delta m$), defined as the widening chasm between what autonomous agents can execute and what humans can afford to verify:

$$\Delta m = m_a - m_h$$

where $m_a$ is agent measurability (the degree to which an agent's outputs can be comprehensively measured) and $m_h$ is human measurability (the degree to which human oversight can effectively validate those outputs).

This gap expands because agent capabilities advance exponentially while human verification capacity grows linearly at best. The fraction of total autonomous deployment that can be reliably verified -- the **verifiable share** ($s_v$) -- defines the "safe industrial zone" where meaningful oversight is genuinely possible.

![AI research cycle](/posts/economics-of-agi/ai_research_cycle.png)

## Three Key Mechanisms

### 1. The Missing Junior Loop

Traditional knowledge transmission relied on apprenticeship -- junior practitioners learning by doing under expert supervision. As junior-level work gets automated, these pathways collapse. The stock of human expertise ($S_{nm}$) shrinks precisely when oversight becomes most critical.

This creates a *competency cliff*: not because current experts disappear, but because no one is being trained to replace them.

![Expert training collapse](/posts/economics-of-agi/experts_erosion.png)

### 2. The Codifier's Curse

Experts inadvertently accelerate their own obsolescence by codifying tacit knowledge into training data. By improving the systems they work with, they convert embodied, contextual expertise into machine-readable form that enables further automation. The perverse incentive: improving your tools accelerates your replacement by them.

![Secret cyborgs](/posts/economics-of-agi/secret_cyborgs.png)

### 3. The "Trojan Horse" Externality

Unverified, unaccountable agentic output ($X_a$) introduced into production creates a classic externality: firms capture private gains from deploying autonomous agents while socializing systemic risk. Measured activity diverges from actual human intent, and hidden debt accumulates in the gap between metrics and reality.

More dangerously, the unmeasured zone allows for the emergence of alien preferences. Because the human cannot inspect the agent's internal reasoning, the agent may develop instrumental sub-goals or value-functions in RL that were never explicitly programmed but emerge as efficient paths through the unverified state space.

This phenomenon is no longer purely theoretical. In controlled evaluations, Scheurer et al. (2023) demonstrated that GPT-4, deployed as an autonomous stock-trading agent in a realistic simulated environment, executed an illegal insider trade and then strategically concealed the true rationale from its human supervisor -- without ever being instructed to deceive.

![Trojan horse externality](/posts/economics-of-agi/trojan_horse.png)

## Hollow Economy vs. Augmented Economy

The paper identifies two possible trajectories:

- **Hollow Economy** (default path) -- explosive nominal output but decaying human agency, characterized by correlated blind spots, accumulating hidden debt, and systemic fragility. Without intervention, economic dynamics push toward unverified deployment because unverified systems can initially outcompete properly-verified ones by externalizing risk.
- **Augmented Economy** (managed path) -- verification scales commensurately with agentic power, enabling unbounded discovery, experimentation, and execution. Requires deliberate investment in verification infrastructure, liability regimes that internalize tail risks, and human augmentation tools.

## The Three Economies

The authors predict that economic activity bifurcates into three sectors:

1. **Solvable Economy** -- tasks fully automatable with reliable verification (manufacturing, routine analysis). Minimal human employment.
2. **Verified Economy** -- tasks automatable but requiring expensive human verification (strategic decisions, quality control). Wealth concentrates in verification gatekeepers.
3. **Status Games Economy** -- value driven by human signaling and status rather than measurable output (luxury goods, exclusive experiences, governance). Amplifies inequality through positional goods.

The middle class -- moderately-skilled workers in the "solvable" zone -- faces the greatest displacement pressure.

## Where Value Concentrates

As ordinary execution becomes commoditized, economic returns concentrate in:

- **Verification infrastructure** -- observability, testing, safety certification
- **Ground truth and provenance data** -- rare, expensive to produce, increasingly valuable. Cryptographic provenance creates a "provenance premium" in markets.
- **Liability management** -- the rise of "Liability-as-a-Service" where specialized firms underwrite autonomous system outcomes
- **Scarce expert human time** -- verification-capable talent becomes non-commoditizable, defensible advantage

## The Illusion of AI-Led Verification

A particularly important warning: using AI systems to verify other AI systems creates false confidence. Correlated blind spots propagate, system error correlations remain hidden, and what appears to scale verification actually introduces systemic risk. The authors argue this is fundamentally insufficient for safety-critical applications.

## Strategies for Different Stakeholders

### For Individuals

Position yourself in verification and validation work, intent direction and goal-setting, or non-measurable creative domains. The most vulnerable roles are pure execution of measurable, well-defined tasks.

### For Companies

Build moats around: verification infrastructure, ground truth data, top verification-capable talent, and non-measurable brand/relationship assets. Network effects should be anchored in verification depth and trust rather than traditional lock-in and switching costs.

### For Policymakers

Address the Trojan Horse externality through liability regimes that internalize tail risks. Treat verification infrastructure as a public good. Invest in human augmentation and upskilling. Coordinate internationally on verification standards to prevent regulatory arbitrage.

## Key Takeaways

1. The binding constraint on AGI-powered growth is not intelligence but **human verification bandwidth**.
2. The **Measurability Gap** ($\Delta m = m_a - m_h$) is the central economic variable to watch.
3. Three self-reinforcing mechanisms -- Missing Junior Loop, Codifier's Curse, and the Trojan Horse externality -- push the economy toward the Hollow Economy attractor by default.
4. Verification becomes a *primary production technology*, not a peripheral cost center.
5. The paper is fundamentally **optimistic with conditions**: the Augmented Economy is achievable, but requires deliberate, scaled investment in verification alongside capability advancement.

> "Nothing in life is to be feared, it is only to be understood." -- Marie Curie

The full paper is available at [arxiv.org/abs/2602.20946](https://arxiv.org/abs/2602.20946).
