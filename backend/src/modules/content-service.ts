import bcrypt from 'bcryptjs';
import { generateUniqueHash } from './hash-generator.js';
import { contentRepository } from './content-repository.js';
import { deleteContent, readContent, saveFileContent, saveTextContent } from '../storage/local-storage.js';
import type { ContentBlock, CreateTextDTO, CreateFileDTO } from '../types/content.js';

function nowIso(): string {
  return new Date().toISOString();
}

function computeExpiration(ttlMinutes: number): string {
  return new Date(Date.now() + ttlMinutes * 60_000).toISOString();
}

function ensureActive(block: ContentBlock): ContentBlock {
  if (block.status !== 'active') {
    throw new Error('CONTENT_NOT_AVAILABLE');
  }
  if (block.expiresAt <= nowIso()) {
    void contentRepository.markExpired(block.hash);
    throw new Error('CONTENT_EXPIRED');
  }
  if (block.maxViews != null && block.viewCount >= block.maxViews) {
    void contentRepository.markExpired(block.hash);
    throw new Error('CONTENT_EXPIRED');
  }
  return block;
}

export async function createTextBlock(dto: CreateTextDTO): Promise<ContentBlock> {
  const hash = await generateUniqueHash();
  const storageKey = await saveTextContent(dto.text);
  const passwordHash = dto.password
    ? await bcrypt.hash(dto.password, 10)
    : undefined;

  const block = await contentRepository.create({
    hash,
    contentType: 'text',
    storageKey,
    textPreview: dto.text.slice(0, 120),
    passwordHash,
    maxViews: dto.maxViews,
    burnAfterRead: dto.burnAfterRead ?? false,
    expiresAt: computeExpiration(dto.ttlMinutes),
    status: 'active',
    userId: dto.userId,  // ← додати цей рядок
  });

  return block;
}

export async function createFileBlock(dto: CreateFileDTO): Promise<ContentBlock> {
  const hash = await generateUniqueHash();
  const storageKey = await saveFileContent(dto.fileBuffer, dto.filename);
  const passwordHash = dto.password
    ? await bcrypt.hash(dto.password, 10)
    : undefined;

  const block = await contentRepository.create({
    hash,
    contentType: 'file',
    storageKey,
    originalFilename: dto.filename,
    mimeType: dto.mimeType,
    passwordHash,
    maxViews: dto.maxViews,
    burnAfterRead: dto.burnAfterRead ?? false,
    expiresAt: computeExpiration(dto.ttlMinutes),
    status: 'active',
    userId: dto.userId,  // ← додати цей рядок
  });

  return block;
}



export async function getBlockMetadata(hash: string): Promise<ContentBlock> {
  const block = await contentRepository.findByHash(hash);
  if (!block) throw new Error('CONTENT_NOT_FOUND');
  return ensureActive(block);
}

export async function getBlockContent(
  hash: string,
  password?: string
): Promise<{ metadata: ContentBlock; data: Buffer }> {
  const block = await contentRepository.findByHash(hash);
  if (!block) throw new Error('CONTENT_NOT_FOUND');

  ensureActive(block);

  if (block.passwordHash) {
    if (!password) throw new Error('PASSWORD_REQUIRED');
    const ok = await bcrypt.compare(password, block.passwordHash);
    if (!ok) throw new Error('WRONG_PASSWORD');
  }

  await contentRepository.incrementViewCount(hash);

  const newCount = block.viewCount + 1;
  if (block.burnAfterRead || (block.maxViews != null && newCount >= block.maxViews)) {
    await contentRepository.markExpired(hash);
    await deleteContent(block.storageKey);
  }

  const data = await readContent(block.storageKey);
  return { metadata: block, data };
}

export async function deleteBlock(hash: string): Promise<void> {
  const block = await contentRepository.findByHash(hash);
  if (!block) throw new Error('CONTENT_NOT_FOUND');
  await deleteContent(block.storageKey);
  await contentRepository.deleteByHash(hash);
}

export async function cleanupExpiredBlocks(): Promise<number> {
  const expired = await contentRepository.findExpired(nowIso());
  for (const item of expired) {
    await contentRepository.markExpired(item.hash);
    await deleteContent(item.storageKey);
  }
  return expired.length;
}

export async function listBlocks(): Promise<ContentBlock[]> {
  return contentRepository.list();
}