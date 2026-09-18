// Phase 12 preparation only. No authenticated backend is configured yet.
// IDs and entitlements must be issued/verified by the server, never localStorage.
export type Plan = 'free' | 'plus' | 'pro';
export type WorkspaceType = 'personal' | 'independent_pro' | 'institute' | 'creator';
export interface User { userId: string; plan: Plan; }
export interface Workspace { workspaceId: string; ownerId: string; type: WorkspaceType; name: string; }
export interface Profile { profileId: string; workspaceId: string; preferences: Record<string, unknown>; }
export interface PublicProProfile {
  proProfileId: string; workspaceId: string; slug: string; displayName: string;
  bio: string; styles: string[]; published: boolean;
  avatarAssetId?: string; generalArea?: string; socialUrl?: string;
}
// Opaque existing app payloads stay in versioned envelopes to avoid rewriting
// the collection/generation/journal engines. Attachments require private storage.
export interface WorkspaceRecord {
  workspaceId: string; kind: 'profile'|'collection'|'inspirations'|'journal'|'tutorials'|'preferences';
  recordId: string; revision: number; schemaVersion: number; payload: unknown;
  updatedAt: string; deletedAt?: string;
}
export interface ProFavorite { workspaceId: string; proProfileId: string; createdAt: string; }
export interface Conversation {
  conversationId: string; proWorkspaceId: string; personalWorkspaceId: string;
  context?: { kind:'inspiration'|'pose'|'moodboard'; sharedSnapshotId: string };
}
export interface Message {
  messageId: string; clientRequestId: string; conversationId: string;
  senderWorkspaceId: string; text: string; sharedSnapshotId?: string; createdAt: string;
}
export interface ReadReceipt { conversationId: string; workspaceId: string; lastReadMessageId: string; }
export interface CatalogueOrigin {
  kind:'nailmoods'|'verified_creator'|'personal'; catalogueId?: string;
  ownerWorkspaceId?: string; sourceProductId?: string; verified:boolean;
}
export interface SessionRepository {
  // Provider adapter must use a proven Auth SDK. No homemade password storage.
  currentUser():Promise<User|null>;
  signOut():Promise<void>;
  workspaces():Promise<Workspace[]>;
}
export interface RecordRepository {
  list(workspaceId:string, cursor?:string):Promise<{records:WorkspaceRecord[];cursor?:string}>;
  // Server enforces membership AND compares the version atomically.
  save(record:WorkspaceRecord, expectedRevision:number):Promise<WorkspaceRecord>;
}
