export type ContentType = 'text' | 'file';
export type ContentStatus = 'active' | 'expired' | 'deleted';

export interface ContentBlock {
  id: number;
  hash: string;
  contentType: ContentType;
  storageKey: string;
  originalFilename?: string;
  mimeType?: string;
  textPreview?: string;
  passwordHash?: string;
  maxViews?: number;
  viewCount: number;
  burnAfterRead: boolean;
  expiresAt: string;
  status: ContentStatus;
  createdAt: string;
}

export interface CreateTextDTO {
  text: string;
  ttlMinutes: number;
  maxViews?: number;
  password?: string;
  burnAfterRead?: boolean;
  userId?: string; 
}

export interface CreateFileDTO {
  fileBuffer: Buffer;
  filename: string;
  mimeType: string;
  ttlMinutes: number;
  maxViews?: number;
  password?: string;
  burnAfterRead?: boolean;
  userId?: string;
}