---
layout: post
title: "Writing Tests That Survive Refactors"
date: 2025-12-05
read: "5 min"
excerpt: "A test suite that breaks every time you rename a method isn't protecting your behavior — it's protecting your implementation. Here's how I try to keep tests coupled to what matters."
---

The fastest way to make a team stop trusting its tests is to write tests that fail for the wrong reasons. If renaming a private method or restructuring a class turns the suite red, the tests are coupled to implementation, not behavior.

My rule of thumb: test through the same door your users come in. Assert on observable outcomes — returned values, emitted events, persisted state — not on the internal calls that produced them. Mock at boundaries you own, not at every collaborator.

This makes tests a little harder to write and far cheaper to keep. A good refactor should leave the suite green; that's the whole point of having one. If it doesn't, the test was describing *how*, when it should have been describing *what*.
