# CloudHero Reply-To Compatibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Repair CloudHero submissions by mapping Emailflare's internal reply address to the Cloudflare REST field.
**Architecture:** Keep the current server and public request schema. Change only the outbound Cloudflare adapter and test it at the fetch boundary.
**Tech Stack:** Existing Node 22, TypeScript, tsx, node:test, pnpm 10; no new dependencies.
**Spec:** docs/superpowers/specs/2026-10-25-cloudhero-reply-to-design.md

## Global Constraints
- Keep the public Emailflare /v1/send API field replyTo and existing callers unchanged.
- Serialize a supplied reply address as reply_to in the Cloudflare REST request; never forward replyTo.
- Omit reply_to when no reply address is supplied.
- Preserve the From display name/address, recipient, subject, html, text, request method, authentication and provider error behavior.
- Do not mutate the caller object, add retries, update dependencies, change domains, touch stored messages, or change unrelated providers or application services.
- Tests use dummy credentials and intercepted HTTP only; no real email or Railway mutation by workers.

## Review Focus
The task's tests cover the relevant classes: supplied reply address, absent reply address, named sender/content preservation, immutable input, and rejected provider response. No additional uncovered input class identified for this field mapping.

### Task 1: Map Reply-To at the Cloudflare HTTP boundary

**Files:** Modify services/backend/src/services/cloudflare.ts; create services/backend/test/cloudflare-send.test.ts; add a test script in services/backend/package.json if needed. No lockfile or dependency changes.
**Interfaces:** Consumes existing CFSendEmailParams and sendEmail(params); returns the same CFSendEmailResult and raises the existing CloudflareApiError on provider rejection.

- [ ] Read the adapter and env module. Tests set dummy ADMIN_TOKEN and SESSION_SECRET of at least 32 characters plus dummy MESAHUB_URL, CF_API_TOKEN and CF_ACCOUNT_ID before dynamically importing the adapter. Use node:test, node:assert/strict and existing tsx. Restore fetch in cleanup. No real external I/O.
- [ ] Add a regression test that intercepts fetch, calls actual sendEmail with replyTo: 'visitor@example.com', and expects JSON reply_to === 'visitor@example.com' and no replyTo property. The body must retain a named From object, to, subject, html and text. Assert original input is unchanged.
- [ ] Run the regression test before implementation; capture the expected failing assertion in the report.
- [ ] Implement the minimal mapping in sendEmail: destructure replyTo from params, serialize the remaining fields, and conditionally add reply_to when supplied. Keep function signature, cfFetch call and all other functions unchanged.
- [ ] Cover absent reply address (both spellings omitted), immutable/frozen input, preserved content and HTTP/auth contract, and an existing Cloudflare error response that must still throw with status/code. Keep tests focused and behavioral.
- [ ] Run the backend test command once and tsc build. There is no existing test suite or test script on this base; add test script using node --import tsx --test test/*.test.ts. Run the admin production build if locally installed; report any unavailable check instead of modifying admin dependencies.
- [ ] Self-review, commit the owned code/tests/script, and write the report with RED/GREEN commands and outcomes. Do not push, merge, deploy, access real credentials, send emails or dispatch subagents.
