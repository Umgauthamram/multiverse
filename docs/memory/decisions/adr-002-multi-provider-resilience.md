# ADR 002: Multi-Model AI Routing & Tri-Provider Fallback Architecture

## Context
Multiverse You simulates 12 parallel timelines across 5 years (20 quarterly steps each = 240 calls). Free-tier or low-tier quotas on any single provider (like Groq's 30 RPM limit or NVIDIA's request limits) are susceptible to HTTP 429 rate limits. Furthermore, different providers have distinct strengths: Groq generates tokens at extreme speeds (~500+ tok/s), NVIDIA NIM provides deep creative persona framing, and Google Gemini possesses a 1M+ token context window capable of reading all 12 timelines simultaneously.

## Decision
We implemented a multi-provider router in `src/lib/ai/router.ts` backed by Vercel AI SDK (`@ai-sdk/openai`, `@ai-sdk/google`):
1. **Groq (`llama-3.1-8b-instant`)**: Primary driver for high-frequency quarterly life simulation steps.
2. **NVIDIA NIM (`meta/llama-3.1-70b-instruct`)**: Primary driver for creative persona profiling and world building.
3. **Google Gemini (`gemini-2.5-flash`)**: Primary driver for cross-timeline narrator synthesis.
4. **Resilient Failover**: If any primary provider returns HTTP 429 or 5xx, the router automatically fails over to the next provider in the chain without dropping user session state.

## Status
Accepted and verified with automated test suites (`tests/unit/router.test.ts`).
