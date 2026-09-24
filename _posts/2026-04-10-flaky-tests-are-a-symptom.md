---
layout: post
title: "Flaky Tests Are a Symptom, Not the Disease"
date: 2026-04-10
read: "6 min"
excerpt: "When a test fails one run in ten, the instinct is to retry it. But flakiness almost always points at something real underneath — timing, shared state, or an assumption about the world that no longer holds."
---

Every team eventually meets the flaky test: green nine times, red the tenth, with no code change in between. The path of least resistance is to add a retry and move on. I think that's a mistake.

Flakiness is information. A test that fails intermittently is telling you that your system has a non-deterministic edge you don't fully understand yet — a race condition, a leaked fixture, a clock you assumed was frozen. Retrying hides the message without addressing the sender.

The discipline I try to hold to: when a test goes flaky, quarantine it, then treat the flakiness itself as the bug. Reproduce it deterministically. Nine times out of ten the root cause is real and would have surfaced in production eventually — just less conveniently.

The tenth time it's a genuinely bad test, and you delete it. That's a fine outcome too. What you don't want is a suite full of retries that has quietly stopped meaning anything.
