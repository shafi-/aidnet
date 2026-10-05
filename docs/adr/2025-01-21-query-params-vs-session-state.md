# Query Parameters vs Session State

**Status:** Accepted  
**Date:** 2025-01-21  

## Decision

- **Public pages** use query params (e.g., `/campaigns/detail?slug=xyz`) — URLs must be shareable
- **Private authenticated pages** use session/provider state only (`currentOrg`) — no org params in URLs
- **System admin pages** can use query params (admin override for cross-org access)

## Rationale

Prevents confusion when URL org ID doesn't match selected org, and avoids exposing internal IDs in private URLs. Private pages reflect the user's current session, not the URL history.
