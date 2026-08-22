# 24 - Single sign-on configured per corporate

**What to build:** Per-corporate sign-on configuration against mainstream institutional identity providers, with the provider's configuration stored per corporate rather than globally.

**This is frequently the item that unblocks a large deal, and it is comparatively small.** It has few dependencies beyond the Phase 1 account-merge mechanism.

**Blocked by:** nothing

**Status:** done
**Covered by:** test/sso.int-spec.ts

- [x] Sign-on configuration is stored per corporate, not globally
- [x] Two corporates can use different providers simultaneously
- [x] A misconfigured provider fails closed with a clear error
- [x] Provider secrets are never returned through any read path
- [x] A corporate administrator cannot configure sign-on for another corporate
