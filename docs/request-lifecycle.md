# Session and request ownership

The server owns authentication facts. The browser projects the current user
and clears that projection on a session endpoint's 401 before navigating to
login. A known expired session needs no additional logout request.

The provider owns each refresh until it finishes, a newer account mutation or
logout invalidates it, or the provider unmounts. Invalidated reads are aborted
and cannot publish a user or session hint, even if their response arrives late.
Profile reads belong to their page or selected tab. Leaving that owner aborts
the read and suppresses late authentication errors; an old profile save cannot
publish into the shared session after leaving the page or starting logout. Creating an access
request uses the returned record directly, without a second list query.
Backchannel decisions retain their request owner through status recovery; a
late result cannot clear another page's session or start an obsolete status read.

Users, clients, grants and access requests submit text searches with **Search**
or **Enter**. Typing alone does not query the server; filters still apply
immediately. Repeating an unchanged search does not refetch it. Each panel owns
one list request: a new query or page aborts the previous read, and leaving the
panel aborts its pending read. Only the current request can publish its rows,
error or loading state. Mutation responses remain authoritative for row updates;
creation and grant revocation retain their existing pagination refresh.

For example, entering `abcdefghij` and submitting performs one search request,
in addition to the initial list request. Tests cover this request count,
superseded responses, page teardown, profile writes and expired-session routing:

- `src/pages/admin/ListRequests.test.tsx`
- `src/auth/AuthContext.test.tsx`
- `src/pages/Profile.test.tsx`
- `src/pages/ExpiredSession.test.tsx`
- `src/pages/Ciba.test.tsx`

Run `npm ci` and `npm test` with the Node version in `.nvmrc`. The full gate
includes audit, lint, type checking, unit and contract tests, production build
checks and the verification-result browser contract.
