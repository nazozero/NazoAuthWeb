# Session and request ownership

The server owns authentication facts. The browser projects the current user
and clears that projection on a session endpoint's 401 before navigating to
login. A known expired session needs no additional logout request.
Protected and guest-only routes check the server before deciding where to send
an unchecked visitor, even when the browser has no session hint. Public pages
do not require this check; a hint may start it eagerly.
An unavailable session check leaves identity unknown and offers a manual retry;
only a confirmed 401 is treated as an absent session.
The consent page loads the authorization request and account in parallel, and
only presents the decision after the current account has been verified.

The provider owns each refresh until it finishes, a newer account mutation or
logout invalidates it, or the provider unmounts. Invalidated reads are aborted
and cannot publish a user or session hint, even if their response arrives late.
Profile reads belong to their page or selected tab. Leaving that owner aborts
the read and suppresses late authentication errors; an old profile save cannot
publish into the shared session after leaving the page or starting logout. Creating an access
request uses the returned record directly, without a second list query.
Backchannel decisions retain their request owner through status recovery; a
late result cannot clear another page's session or start an obsolete status read.
Device decisions likewise belong to the selected code and route. Leaving that
route discards late UI updates without cancelling or repeating the submitted
decision. A CIBA decision with a network or server error is reconciled by reading
its status; an unavailable status requires an explicit check before another decision.

Account forms keep their inputs and mode fixed during submission. Registration
success leaves navigation to the visitor. Initial administrators are created
through the controller's `admin create` command; there is no browser setup route.

Users, clients, grants and access requests submit text searches with **Search**
or **Enter**. Typing alone does not query the server; filters still apply
immediately. Repeating an unchanged search does not refetch it. Each panel owns
one list request: a new query or page aborts the previous read, and leaving the
panel aborts its pending read. Only the current request can publish its rows,
error or loading state. Mutation responses remain authoritative for row updates;
creation and grant revocation retain their existing pagination refresh.
Each panel permits one mutation at a time. User, client and grant row mutations
also lock list queries until completion, so a concurrent read cannot replace
their returned state or change the query used by a required refresh. Leaving the
panel prevents a completed write from starting a new list read.
Client and access-request dialogs cannot close or change
their inputs during submission. A newly created client's one-time secret stays
in its dialog until the user explicitly dismisses it.

For example, entering `abcdefghij` and submitting performs one search request,
in addition to the initial list request. Tests cover this request count,
superseded responses, page teardown, profile writes and expired-session routing:

- `src/pages/admin/ListRequests.test.tsx`
- `src/auth/AuthContext.test.tsx`
- `src/pages/Profile.test.tsx`
- `src/pages/ExpiredSession.test.tsx`
- `src/pages/Ciba.test.tsx`
- `src/pages/DeviceOwnership.test.tsx`
- `src/pages/admin/MutationOwnership.test.tsx`
- `src/pages/admin/ModalOwnership.test.tsx`

Run `npm ci` and `npm test` with the Node version in `.nvmrc`. The full gate
includes audit, lint, type checking, unit and contract tests, production build
checks and the verification-result browser contract.
