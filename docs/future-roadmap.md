# Future roadmap

This roadmap records capabilities that the first release intentionally excludes. Do not treat these items as commitments or enable them without a separate product, privacy, and security review.

## Read-only bank connections

Add read-only transaction retrieval through a provider such as Plaid. Keep provider credentials on the server, request the smallest practical permission scope, and route retrieved transactions through the same canonical transaction and user-review workflow as statement imports.

The `BankConnectionProvider` interface keeps provider-specific authorization and transaction formats outside the subscription model.

## Email subscription discovery

Add optional discovery from connected email accounts. Use narrowly scoped permissions, process only messages needed for subscription discovery, and require explicit approval before saving a subscription.

The `EmailDiscoveryProvider` interface returns review candidates without changing core subscription records. Do not send email or financial content to an AI service without a separate approved design.

## Additional reminder channels

Add email, push, and SMS adapters behind the `NotificationService` interface. Preserve the in-app reminder implementation as the development and fallback provider. Let users control each channel and reminder type.

## Household sharing

Add invitation-based household workspaces with explicit roles and record-level authorization. Do not expose private payment details or historical transactions to household members by default.

## Native mobile applications

Add iPhone and Android clients only after the web API and authorization model stabilize. Reuse validated server operations instead of duplicating sensitive business logic in each client.

## International formats and currencies

Add regional statement adapters, locale-aware column mapping, multi-currency reporting, and explicit foreign-exchange handling. Continue to store money as integer minor units with an ISO 4217 currency code.

## Community cancellation guidance

Add reviewed community contributions for cancellation instructions. Track sources, verification dates, moderation status, and change history. Always describe cancellation guidance as informational, and state that only the provider confirms cancellation.

## Negotiation and cancellation services

Evaluate third-party negotiation or cancellation providers as a separate regulated and security-sensitive product area. Do not imply that SubTrack performs these actions until a provider confirms the result and the product can communicate authorization, fees, status, and failure clearly.

## Deferred statement formats

Add OFX, QFX, and text-based PDF adapters after CSV importing and its tests work reliably. Each adapter implements the provider-neutral `StatementImporter` contract so mapping, normalization, detection, review, and persistence remain unchanged.
