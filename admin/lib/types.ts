export type AspirationStatus = 'PENDING' | 'REVIEWING' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
export type ModerationStatus = 'APPROVED' | 'NEEDS_REVIEW' | 'REJECTED';
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';

export interface PublicSettings {
  schoolName: string;
  classes: string[];
  categories: { slug: string; name: string }[];
  maintenanceMode: boolean;
  turnstileSiteKey: string | null;
  upload: { maxFiles: number; maxSizeBytes: number; allowedExtensions: string[] };
}

export interface TrackingResult {
  code: string;
  title: string;
  category: string;
  className: string;
  status: AspirationStatus;
  statusLabel: string;
  statusDescription: string;
  createdAt: string;
  timeline: { status: AspirationStatus; label: string; at: string }[];
  replies: { id: string; message: string; createdAt: string }[];
}

export interface AdminUser { id: string; email: string; name: string; role: AdminRole }

export interface AspirationListItem {
  id: string; code: string; title: string; className: string;
  status: AspirationStatus; moderationStatus: ModerationStatus; createdAt: string;
  category: { name: string; slug: string };
  _count: { replies: number; attachments: number };
}
export interface AspirationList { items: AspirationListItem[]; total: number; page: number; pageSize: number; totalPages: number }

export interface AspirationDetail {
  id: string; code: string; className: string; authorName: string | null; title: string; body: string;
  status: AspirationStatus; moderationStatus: ModerationStatus; createdAt: string; archivedAt: string | null;
  userAgent: string | null;
  category: { name: string; slug: string };
  attachments: { id: string; originalName: string; mimeType: string; size: number }[];
  replies: { id: string; message: string; createdAt: string; admin: { name: string } | null }[];
  statusHistory: { id: string; fromStatus: AspirationStatus | null; toStatus: AspirationStatus; note: string | null; createdAt: string; admin: { name: string } | null }[];
  moderationLogs: { id: string; source: 'AUTO' | 'ADMIN'; decision: ModerationStatus; score: number | null; reasons: string[] | null; note: string | null; createdAt: string; admin: { name: string } | null }[];
}

export interface FavoriteTeacherItem {
  id: string; name: string; isActive: boolean; sortOrder: number; votes: number; percentage: number;
}
export interface FavoriteTeacherOverview {
  active: boolean; totalVotes: number; teachers: FavoriteTeacherItem[];
}

export interface Statistics {
  total: number; pending: number; reviewing: number; inProgress: number; resolved: number; archived: number; needsReview: number;
  byCategory: { name: string; count: number }[];
  last7Days: { date: string; count: number }[];
}
