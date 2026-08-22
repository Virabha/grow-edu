# 24 - Single sign-on configured per corporate

**What to build:** Per-corporate sign-on configuration against mainstream institutional identity providers, with the provider's configuration stored per corporate rather than globally.

**This is frequently the item that unblocks a large deal, and it is comparatively small.** It has few dependencies beyond the Phase 1 account-merge mechanism.

**Blocked by:** nothing

**Status:** not-started

- [ ] Sign-on configuration is stored per corporate, not globally
- [ ] Two corporates can use different providers simultaneously
- [ ] A misconfigured provider fails closed with a clear error
- [ ] Provider secrets are never returned through any read path
- [ ] A corporate administrator cannot configure sign-on for another corporate
