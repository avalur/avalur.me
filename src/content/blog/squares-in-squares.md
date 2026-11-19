---
title: "Squares in Squares: Packing as Algorithm Engineering"
description: "Project in Algorithm Engineering course: pack n unit squares into the smallest square, from the separating axis theorem and certified arithmetic to penalty optimisation, LP polishing and dynamic programming over gadgets."
date: 2026-11-19
tags: ["Algorithms", "Optimization", "Geometry", "Kaggle"]
readingTime: "22 min"
draft: false
---

<style>
/* Results table: rows with other teams' numbers get a grey background. */
.prose tr:has(.sq-ext) td { background: color-mix(in srgb, var(--fg-secondary) 16%, transparent); }
</style>

## Introduction

How small can a square box be if it has to hold $n$ unit squares? The squares may be rotated, but they must not overlap. The area gives a lower bound right away: the side $L$ is at least $\sqrt{n}$. When $n$ is a perfect square, the obvious uniform grid reaches that bound. For every other $n$ the grid needs side $\lceil \sqrt{n}\, \rceil$, and that is usually not optimal.

The smallest example is $n = 5$. A $2 \times 2$ grid with one extra square needs a $3 \times 3$ box. Put four squares in the corners instead, tilt the fifth by $45^\circ$ and put it in the middle, and the side drops to $2 + 1/\sqrt{2} \approx 2.707$. For $n = 10$ the best side is $3 + 1/\sqrt{2}$, and Walter Stromquist [[proved it]](https://www.combinatorics.org/ojs/index.php/eljc/article/view/v10i1r8) in 2003. For $n = 11$ the best packing, found by Walter Trump in 1979, has side $\approx 3.8771$. Stromquist showed in the same paper that no packing of 11 squares using only $0^\circ$ and $45^\circ$ tilts can reach it, and Trump's packing indeed uses other angles. Its optimality was shown only on September 29, 2026, in an AI-assisted proof [[wiki]](https://en.wikipedia.org/wiki/Square_packing). The best known packing for $n = 17$ (side $\approx 4.6755$) was found in 1998 by John Bidwell, an undergraduate student. Most other values are open.

![Best packings for small n](/posts/squares-in-squares/small-records.png)
*Best packings for $n = 5$, $10$ and $11$ (proven optimal) and $n = 17$ (best known).
Tilted squares are dark. Coordinates from the known-best witnesses of [jlevy/squares](https://github.com/jlevy/squares), checked with a strict verifier.*

For large $s$ the question becomes asymptotic. Let $N(s)$ be the largest number of unit squares that fit in a square of side $s$, and call $W(s) = s^2 - N(s)$ the **wasted area**. The grid wastes about $2s \cdot \{s\}$, which is linear in $s$. In 1975 Erdős and Graham showed that tilting can make the waste sublinear, $W(s) = O(s^{7/11})$. A chain of later improvements brought the exponent down to about $0.6$, while the best lower bound (Roth and Vaughan, 1978) is of order $\sqrt{s}$ for some $s$. The true growth rate is still unknown [[wiki]](https://en.wikipedia.org/wiki/Square_packing).

In October 2026 Kaggle launched the [Squares in Squares](https://www.kaggle.com/competitions/squares-in-squares) competition. It asks for packings for all $n = 1, \ldots, 1000$ at once, and the score is

$$\text{score} = \sum_{n=1}^{1000} \left( \frac{L_n}{\sqrt{n}} - 1 \right) \quad \to \quad \min.$$

The grid scores $28.94$. On November 18, 2026 the leaderboard leader has $22.040$, and more than two thousand teams are in between. I have spent the last few weeks on this problem, and it turned out to be a nice playground for **algorithm engineering**: exact geometry and floating point, continuous optimisation, linear programming, dynamic programming, profiling and parallel computing all matter, and the leaderboard is an honest judge with no hidden test set.

## Overall Goal of the Project

> You will build a packing pipeline for $n$ unit squares in a square: an exact verifier, a continuous optimiser that finds good packings for small $n$, and a composition algorithm that assembles packings for large $n$ out of small pieces. Then you will measure what each part contributes and why. By the end you should see why the best results come from combining the three, rather than from running any single algorithm longer.

## 0. The Grid, the Bound and the Bands

The trivial packing puts the squares on a grid of side $\lceil \sqrt{n}\, \rceil$. Its score summed over $n \le 1000$ is $28.9377$. The area bound $L \ge \sqrt{n}$ would give $0$, but it cannot be reached except at perfect squares.

The structure of the score becomes clear if we split $n$ into **bands** $k^2 < n \le (k+1)^2$. Inside band $k$ the best side lies between $k$ and $k + 1$, so it is natural to look at the excess $F = L - k$:

![Band structure](/posts/squares-in-squares/bands.png)
*Top: excess $F = L - k$ of the best known packing for every $n$, taken from the per-puzzle leaderboard that the host publishes. Bottom: per-puzzle score of the best known packings against the grid (log scale).*

Each band looks the same. The first $n = k^2 + 1$ costs about half a square of extra side, $F \approx 0.5$. Then $F$ grows almost linearly with $j = n - k^2$ until it reaches $1$, about $1.2k$ steps later. The remaining $n$ in the band stay on the grid: on November 18, 437 of the 1000 puzzles (31 of them perfect squares) still have $L = \lceil \sqrt{n}\, \rceil$.

![Two bands](/posts/squares-in-squares/band-zoom.png)
*Bands $k = 20$ and $k = 30$: $F$ against $j = n - k^2$.*

Two facts follow.

1. **The score is determined by one function.** Since $L(n) = \min\{ s : N(s) \ge n \}$, the whole leaderboard is a question about $N(s)$: how many extra squares can we squeeze into a box of side $k + F$? A construction that fits $k^2 + j$ squares into side $k + F$ also gives every smaller $n$ in the band.
2. **The score is spread evenly.** Every band contributes about $0.7$ (the grid gives about $0.95$), and there are about thirty of them. Puzzles with $n > 100$ hold 71% of the best known total. They are also the ones that nobody has studied one by one, because there are hundreds of them.

## 1. Is It a Valid Packing? Exact Geometry First

Before optimising anything, we need a function that says "yes, this packing is valid" and is never wrong. That is harder than it sounds.

### Separating Axis Theorem

Two convex polygons are disjoint if and only if there is a line separating them. For polygons it is enough to check the normals of their edges: project both shapes onto each normal and look for a gap between the two intervals. Two squares have only four distinct normals, two per square.

![Separating axis theorem](/posts/squares-in-squares/sat.png)
*Projections of two unit squares onto the face normal of the tilted one. Left: the intervals overlap on all four axes, so the squares intersect; the smallest overlap is the penetration depth. Right: a gap on one axis proves the squares are disjoint.*

For two **unit** squares with centres $c_i, c_j$ and angles $\theta_i, \theta_j$ there is a closed form. The projection of square $j$ onto a face normal $u$ of square $i$ has half-width

$$h(\Delta\theta) = \frac{|\cos \Delta\theta| + |\sin \Delta\theta|}{2}, \qquad \Delta\theta = \theta_j - \theta_i,$$

so the overlap along $u$ is $\frac{1}{2} + h(\Delta\theta) - |u \cdot (c_i - c_j)|$. The penetration depth is the minimum of this expression over the four normals. Positive means overlap, and zero or negative means the squares are separated. The same quantity appears again in the optimiser below, where it is the term we penalise.

For $n = 1000$ there are about half a million pairs, so a **broad phase** comes first. Sort the bounding boxes by $x$ and sweep, or hash the squares into a uniform grid; only pairs whose boxes intersect go to the exact test. One detail is easy to get wrong: a float broad phase can drop a pair that actually touches or overlaps, so the boxes must be padded. The first version of the official metric had holes of exactly this kind. Participants reported them on the forum within days, and the metric was patched. The lesson for us: **make your own verifier stricter than the judge**, so that a fix to the judge never invalidates your work.

### Floating Point and Certification

The official metric parses coordinates as decimal strings and certifies each pair with interval arithmetic in `mpmath`, escalating from 50 to 500 digits. That creates a subtle problem. A good packing has many **touching** squares, and an exact contact between rotated squares can never be certified: the interval for the overlap always contains $0$.

The fix is simple. Measure the worst penetration $p$ in high precision and scale all centres about the centre of the box by $1 + \max(p, 0) + \varepsilon$ with $\varepsilon = 10^{-30}$. Two touching unit squares have centres at least $1$ apart along their separating axis, so the gap between them grows by at least the excess of the scale. The side grows by about $(L - 1)\varepsilon$, far below what the score can see. The score is a double, so differences in $L$ below about $10^{-15}$ are free, and ties go to the earlier submission. Polishing every packing to the last representable digit therefore pays as well.

One more rule saved me many times: **every packing enters the database through one door.** The best packing for each $n$ is stored as decimal strings, and a new candidate replaces it only after strict verification and only if its $L$ is strictly smaller. With that invariant you can run dozens of experiments in parallel, and none of them can make the result worse.

## 2. Local Optimisation: Loosen and Squeeze

Given a packing, how do we improve it? There are two kinds of local methods, and they complement each other.

### Feasible Steps: Sequential Linear Programming (SLP)

Linearise the geometry around the current poses. For every pair of nearby squares, keep the face that separates them best right now and require all four corners of one square to stay beyond it. That condition is linear in the positions and becomes linear in the angles after a first-order expansion. Add the condition that all corners stay in the box $[X_0, X_0 + L] \times [Y_0, Y_0 + L]$, and ask a linear program for the step $(\Delta x_i, \Delta y_i, \Delta \theta_i)$ that minimises $L$ inside a trust region:

$$
\begin{aligned}
& \quad \quad \quad \min_{\Delta,\, L} \ L \\
\text{s.t.} \quad & \text{linearised separation of all near pairs}, \\
& \text{all corners inside the box}, \|\Delta\|_\infty \le r.
\end{aligned}
$$

The variables are the step $\Delta = (\Delta x_i, \Delta y_i, \Delta\theta_i)_{i=1}^{n}$ for all squares and the new side $L$. For each near pair $(i, j)$, let $u$ be the outward normal of the face of square $i$ that separates the pair best at the current poses. Separation means that every corner $p$ of square $j$ satisfies $u \cdot (p - c_i) \ge \frac{1}{2}$, where $c_i$ is the centre of square $i$. This is linear in the positions and is linearised in the two angles. Containment means that every corner lies in $[X_0, X_0 + L] \times [Y_0, Y_0 + L]$. The trust region $r$ keeps the step small enough for the linearisation to hold.

The linearisation error is $O(\Delta\theta^2)$, so the step is accepted on a merit function and the trust region adapts. SLP converges to a **locally rigid** packing, in which the contact graph locks every square. It is fast and precise, and it gave me the first gain in the competition: one pass over the best public packings improved 381 of them. But it never changes which squares touch which, so it stays in the basin where it starts.

### Infeasible Steps: Penalty Relaxation

To change the contact structure, allow overlaps for a while and penalise them:

$$E(x, y, \theta) = \sum\limits_{i < j} \max(0, d_{ij})^2 + \sum\limits_{\text{corners}} (\text{wall violation})^2,$$

where $d_{ij}$ is the penetration depth from the previous section. $E$ is piecewise smooth, so L-BFGS minimises it well with the analytic gradient. L-BFGS (limited-memory Broyden–Fletcher–Goldfarb–Shanno) is a quasi-Newton method: it estimates the curvature from the last few gradient differences instead of storing a full Hessian, so it scales to thousands of variables. **Squeezing** means shrinking the box step by step and re-minimising $E$, as long as the minimum is still about $0$. On the way squares can pass through each other's former positions, which no feasible method allows. The squeeze ends with penetrations around $10^{-7}$, and SLP then removes them exactly.

In practice the loop is:

1. **loosen**: scale the packing up by a few percent and jitter positions and angles;
2. **squeeze**: penalty L-BFGS while shrinking the box;
3. **polish**: SLP to exact contacts;
4. **certify** and offer the result to the database.

Here is what a from-scratch squeeze (about 80 lines of NumPy and SciPy, random starts, numerical gradient) does for $n = 10$:

![Squeeze from random starts](/posts/squares-in-squares/squeeze-n10.png)
*The best of 60 random restarts for $n = 10$: overlapping start, relaxation in a loose box, squeezing, final packing. Tilted squares are dark.*

The same code with 60 random restarts per $n$ (a few seconds per restart):

| $n$ | Best known | Best of 60 | Within $10^{-3}$ of best known | No better than grid |
| --- | --- | --- | --- | --- |
| 5 | 2.7071 | 2.7071 | 2 | 43 |
| 10 | 3.7071 | 3.7071 | 3 | 34 |
| 11 | 3.8771 | 3.9144 | 0 | 57 |
| 17 | 4.6755 | 4.7289 | 0 | 48 |

This is the naive version: numerical gradient, random overlapping starts, no shaking, no SLP. Even for $n = 5$ most restarts end no better than the grid, and the success rate falls quickly with $n$. Better moves, such as random shakes during the squeeze, change which basins the search reaches, but at large $n$ wins stay rare: in my full pipeline far fewer than one restart in a hundred improved a gadget.

A far better source of starting points than random restarts is the structure we discuss in the next section.

A few engineering facts from the full-scale version:

- **Most of the time goes into failures.** About 90% of the squeeze time was spent on relaxations that could not succeed because the box was already too tight. Stopping L-BFGS as soon as the energy stalls was worth more than any micro-optimisation.
- **Closed forms beat generic code.** The unit-square formula for the penetration depth is about 9 times faster than the generic corner-projection kernel. With L-BFGS also written in Numba, one restart became about 25 times faster. After that the LP dominated: HiGHS needs about a second per LP for 400 squares.
- **Give every solver a time limit.** One degenerate LP cycled for 45 minutes before I added one.

## 3. Composition: Fault Lines and Gadgets

A random start for $n = 500$ will not find a good packing in any reasonable time. Good packings for large $n$ are not random, though. Most records for $n > 100$ share one structure, which became public early in the competition thanks to Chris Deotte's notebook on fault-line dynamic programming.

### The Fault-Line Construction

Take a $K \times K$ grid of upright squares and cut it along a monotone staircase from the top-left to the bottom-right. Shift everything above the staircase by $(F, F)$. The box grows to side $K + F$, and a gap of width $F$ opens along the staircase. Now replace some $w \times h$ blocks of cells on the staircase by **gadgets**: packings of $wh + \Delta m$ squares in a $(w + F) \times (h + F)$ box. Every gadget is walled in by upright squares from the two lattices. If consecutive gadgets are separated by one buffer column or row, they never interact, and

$$L = K + \max_g f_g, \qquad N = K^2 + \sum_g \Delta m_g,$$

where $f_g \le F$ is the overhang a gadget needs.

![Fault-line construction](/posts/squares-in-squares/fault-line-toy.png)
*The $n = 5$ packing is itself a gadget: $2 \times 2$ cells $+1$ square with overhang $1/\sqrt{2}$. One copy in a $3 \times 3$ grid gives $n = 10$; three copies in a $7 \times 7$ grid give $n = 52$. Both match the best known values, and so do $n = 27$ and $38$ built the same way. All packings in this figure passed the strict verifier.*

This toy family alone, the grid plus chains of $n = 5$ gadgets, takes the total score from $28.94$ to $25.61$ (I certified it for every $K = 2, \ldots, 31$). The idea of filling a gap with tilted pieces is old: Erdős and Graham's tilted "sticks" and the bands of Chung and Graham or Kearney and Shiu are gadgets in this sense. The fault-line formulation with a DP over gadget chains comes from the competition's public notebooks. David Ellsworth's [catalogue](https://kingbird.myphotos.cc/packing/squares_in_squares.html) has many beautiful examples.

### Where Gadgets Come From

**Crops.** Put a corner of any good packing at the origin, under any of the 8 symmetries of the square. The box $[0, w + f] \times [0, h + f]$ contains square $i$ if and only if $r_i = \max(0,\, x_i^{\max} - w,\, y_i^{\max} - h) \le f$. So the overhang needed to hold $wh + \Delta m$ squares is the $(wh + \Delta m)$-th smallest $r_i$. A subset of a valid packing is valid, so every crop is a valid gadget for free. One packing yields thousands of gadgets.

**Optimised gadgets.** A gadget is a packing problem of its own, in a rectangle instead of a square. Loosen-and-squeeze works there too, and it is far cheaper than optimising whole puzzles, because a gadget has tens to hundreds of squares instead of a thousand.

### The Chain DP

Fix $K$ and a candidate overhang $F$. Let $G_F$ be the gadgets with $f \le F$. We want a chain of gadgets from $G_F$ along a staircase that fits into $K$ columns and $K$ rows and maximises $\sum \Delta m$. Let $D[c][r]$ be the largest $\sum \Delta m$ of a chain that fits into $c$ columns and $r$ rows. With joins through one buffer column or row this is a two-dimensional knapsack:

$$
D[c][r] = \max_{g \in G_F}
\begin{cases}
D[c - w_g - 1][\,r - h_g\,] + \Delta m_g & \text{(buffer column)} \\
D[c - w_g][\,r - h_g - 1\,] + \Delta m_g & \text{(buffer row)}
\end{cases}
$$

The base case is a single gadget, which needs no buffer: $D[c][r] \ge \Delta m_g$ whenever $c \ge w_g$ and $r \ge h_g$. $D$ is monotone in $c$ and $r$. Then $n = K^2 + j$ is reachable at side $K + F$ if $\max_{c, r \le K} D[c][r] \ge j$. Sweep $F$ over the sorted overhangs of the library and you get $L(n)$ for every $n$ in the band at once.

The DP also explains why the leaderboard moves the way it does. **One better gadget can improve dozens of puzzles at once**, in several bands. But many gadget improvements change nothing, because the improved gadget is not the bottleneck $\max f$ of any optimal chain. So the useful question is not "which gadget can I improve" but "which gadget, if improved by $\delta$, would move the score": rerun the DP with a hypothetical $f - \delta$ for one gadget and measure. Ranking the work by this **marginal value** tells you where compute can pay at all, before you spend it.

## 4. Results

| Step | Score | Notes |
| --- | --- | --- |
| Grid $\lceil \sqrt{n}\, \rceil$ | 28.938 | |
| Grid + chains of the $n = 5$ gadget | 25.610 | the toy family above |
| Best public notebooks, blended per $n$ (Oct 26) | 22.298 | about 200 of 885 teams sat here |
| + SLP polish of every packing | 22.295 | 381 puzzles improved |
| Gadget optimisation + DP, plus newly published packings (Nov 5) | 22.184 | #18 of 1643 teams |
| Same pipeline, new moves, more compute (Nov 18) | 22.113 | #30 of 2224 teams |
| <span class="sq-ext">Leaderboard #1 (Nov 18)</span> | 22.040 | other team |
| <span class="sq-ext">Best known value for each $n$ separately, over all teams (Nov 18)</span> | 22.031 | all teams combined |

The last two rows show how competitive this is: nobody holds all the records, and even the leader is $0.009$ away from the per-puzzle best. Around 20th place the score moves by about $0.005$ a day. Part of that comes from teams publishing packings in public notebooks and datasets, which everybody can use. So the competition rewards a good pipeline and constant iteration, not one clever idea.

## 5. Lessons in Algorithm Engineering

**Verification first.** The verifier is the first thing to write and the last thing to trust. Make it stricter than the official one. If every result goes through one door that verifies and keeps only strict improvements, experiments are cheap and safe.

**Floating point is part of the problem.** Exact contacts cannot be certified, and differences below the double resolution of the score are free. Both facts change the algorithm: we certify by scaling, and we polish to the last digit.

**Feasible and infeasible methods complement each other.** SLP is precise but stays in its basin; the penalty method changes the contact structure but leaves small overlaps. Use the penalty method to move between basins and SLP to finish.

**Composition beats brute force.** For large $n$ the best investment is not a faster whole-puzzle optimiser but a library of small pieces and a DP that assembles them. Every gadget improvement is then multiplied by the number of puzzles it serves.

**Measure against a control.** Every experiment should include a run without the change, under the same budget and seed. Once a pilot run reported 45 "wins" on one puzzle; all of them came from a better packing that another job had stored while the pilot was running, and only the control run showed it. Equally important: a cheap proxy can rank candidates wrongly. The penalty energy after a squeeze, for example, did not predict which moves would win after the final LP.

**Parallel code has its own bugs.** A few that cost me hours:

- each worker of a process pool started its own multi-threaded BLAS and HiGHS, about four threads per worker, and the jobs became 4-5 times slower until I set `OMP_NUM_THREADS=1`;
- with the `spawn` start method, workers cannot re-import a script piped through stdin, and the pool hangs silently;
- starting the largest jobs first (LPT scheduling) removed a long tail in which 14 of 15 workers sat idle;
- cluster jobs have time limits, so long searches must be split into shards that save their results.

**Evolving the search with an LLM.** In the spirit of [AlphaEvolve](/posts/matrix-multiplication), I also ran an evolutionary loop ([ShinkaEvolve](https://github.com/SakanaAI/ShinkaEvolve)) in which an LLM rewrites the gadget search program and the best programs survive. It worked: the evolved program beat the hand-written baseline on held-out gadgets. Its gains on the leaderboard were small, though, compared with structural ideas. Most of the effort went into the evaluator: a sandbox for generated code, a held-out set, and re-verification of every result outside the sandbox. Exactly as in the AlphaEvolve paper, **rigorous automated evaluation** is the ingredient that makes the rest possible.

**Working with coding agents.** Most of the roughly 30 thousand lines of Python in this project were written together with Claude Code, Codex and a bit of Gemini 4 Carbon, in about three and a half weeks and more than 650 commits. What made that work was the same as with human collaborators: a strict verifier, a written handoff document with the current state and the list of failed ideas, and a few hard rules (for example, no submission and no paid cloud resources without my explicit OK).

## 6. Algorithm Engineering Task for Students

Your task is to build a packing pipeline and to measure where its score comes from. You may use NumPy, SciPy, an LP solver (HiGHS via `scipy.optimize.linprog` is enough) and Numba, or any other existing packing code or published packings. Best known values for small $n$ are in David Ellsworth's [catalogue](https://kingbird.myphotos.cc/packing/squares_in_squares.html). The official metric is a public [Kaggle notebook](https://www.kaggle.com/code/metric/squares-in-squares).

### Part 1: Verifier and Baseline

- Implement the exact check: separating axis test for every pair, containment in the box, and a broad phase. Compare the running time of the $O(n^2)$ all-pairs check and a sort-and-sweep or grid broad phase for $n = 100, 1000, 10000$.
- Implement certification. Either use interval arithmetic (`mpmath.iv`) or exact rationals. For exact rationals, note that angles with rational cosine and sine, $\cos\theta = \frac{a^2 - b^2}{a^2 + b^2}$ and $\sin\theta = \frac{2ab}{a^2 + b^2}$, make all corner coordinates rational if the centres are rational.
- Implement certification by scaling and check that it turns a packing with touching rotated squares into one your verifier accepts.
- Build the grid packing for all $n \le 1000$ and reproduce the score $28.9377$.

### Part 2: Local Optimisation

- Implement the penalty energy with its analytic gradient and check the gradient against finite differences. Then implement squeezing with L-BFGS.
- For $n = 2, \ldots, 30$, run random restarts and report the best side, the success rate (the fraction of restarts within $10^{-4}$ of the best known value) and the time to reach the best known value. Plot the success rate against $n$.
- Implement an SLP polish with a trust region and show how much it improves the squeezed packings and how close it brings them to exact contacts.
- Try at least one idea to escape bad basins (shaking during the squeeze, removing and re-inserting a square, starting from the best packing for $n + 1$ minus one square) and measure its effect against a control run with the same budget.

### Part 3: Composition

- Implement the fault-line construction and the chain DP. Check the construction with your verifier, not only by formula.
- Start with the $n = 5$ gadget only and reproduce the total score $25.61$.
- Add gadgets cropped from your own Part 2 packings (all corners, all 8 symmetries), then gadgets optimised alone in their rectangles. Report the total score after each step.
- Implement the marginal value of a gadget: the score gain if its overhang were smaller by $\delta$. Which gadgets have the highest value? Spend your optimisation budget on them and compare with spending it uniformly.
- Build a complete submission file and check it with the official metric notebook.

### Part 4: Analysis

Write a short report with your measurements. Address the following points:

- **Precision and certification (5 points):** Did your verifier ever disagree with the official metric? How large is the side increase from certification, and is it visible in the score? What happens if you skip certification and submit raw floats?
- **Local search (5 points):** Compare penalty squeezing and SLP. For which $n$ do restarts find the best known packing, and how does the success rate change with $n$? Which escape moves helped, judged against the control?
- **Composition (5 points):** How much of your total score comes from each gadget source? Which gadgets lie on the critical chains of many puzzles? Did ranking work by marginal value beat uniform effort?
- **Performance engineering (5 points):** Profile your pipeline. Where does the time go: energy, gradient, LP, verification? What did vectorisation, Numba or parallelism give you? Report the speedups and how your code scales with $n$.
- **Overall takeaways (5 points):** Compare your score with the public leaderboard. Where would you invest the next week of work, and why? Base your answer on your own measurements, not only on intuition.
