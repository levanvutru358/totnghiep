export const REVIEW_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'HIDDEN'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export const MIN_REVIEW_RATING = 1;
export const MAX_REVIEW_RATING = 5;
export const MIN_REVIEW_CONTENT_LENGTH = 3;
export const MAX_REVIEW_CONTENT_LENGTH = 2000;
export const MAX_REVIEW_TITLE_LENGTH = 255;

export const COMMENT_STATUSES = ['VISIBLE', 'HIDDEN', 'PENDING'] as const;
export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export const REPORT_STATUSES = ['PENDING', 'RESOLVED', 'DISMISSED'] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];
