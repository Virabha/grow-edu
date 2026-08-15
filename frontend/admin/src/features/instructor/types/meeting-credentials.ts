/** What GET /instructor/meeting-credentials returns — secrets are NEVER included. */
export interface MeetingCredentialsSafeView {
  zoomClientId: string | null;
  zoomSecretConfigured: boolean;
  jitsiAppId: string | null;
  jitsiSecretConfigured: boolean;
}

/** PUT /instructor/meeting-credentials/zoom */
export interface UpsertZoomCredentialsInput {
  clientId: string;
  /** Empty string / absent means "leave the stored secret unchanged". */
  clientSecret?: string;
}

/** PUT /instructor/meeting-credentials/jitsi */
export interface UpsertJitsiCredentialsInput {
  appId: string;
  /** Empty string / absent means "leave the stored app key unchanged". */
  appKey?: string;
}
