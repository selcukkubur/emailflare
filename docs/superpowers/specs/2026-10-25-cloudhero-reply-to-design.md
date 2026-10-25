# CloudHero live sending compatibility repair

The merged CloudHero integration reaches the owned Emailflare service. Live test bb7513c7 failed with Cloudflare invalid_request_schema. The deployed backend serializes its internal replyTo property verbatim; Cloudflare REST requires reply_to. Confirmed by reading the deployed function through Railway SSH and official REST documentation on 2026-10-25.

## Required behavior
- Keep the public Emailflare /v1/send API field replyTo and existing callers unchanged.
- Serialize a supplied reply address as reply_to in the Cloudflare REST request; never forward replyTo.
- Omit reply_to when no reply address is supplied.
- Preserve the From display name/address, recipient, subject, html, text, request method, authentication and provider error behavior.
- Do not mutate the caller object, add retries, update dependencies, change domains, touch stored messages, or change unrelated providers or application services.
- Tests use dummy credentials and intercepted HTTP only; no real email or Railway mutation by workers.

## Controller choices
A minimal compatibility patch builds on the owner's existing origin/trunk, preserving its deployed manual-domain fallback and usage-count fixes. No broad upstream upgrade. Fresh isolated worktree outside the source checkout protects the existing branch and its untracked pnpm stores. User already requested execution and opted out of further design questions.

## Release and verification
Prepare reviewed code and a PR in selcukkubur/emailflare. A shared-provider deployment is a separate release decision. After authorization, preserve Railway /data volume, credentials and configuration, verify terminal deployment SUCCESS, then resubmit the labelled CloudHero QA brief once only after confirming the original attempt failed with no acceptance. Record provider acceptance separately from inbox receipt.

Official contract: https://developers.cloudflare.com/email-service/examples/email-sending/recipients/
