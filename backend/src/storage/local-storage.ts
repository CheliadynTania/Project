import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';
import 'dotenv/config';

const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  endpoint: process.env.AWS_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.AWS_BUCKET_NAME!;

export async function saveTextContent(text: string): Promise<string> {
  const storageKey = `${randomUUID()}.txt`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    Body: text,
    ContentType: 'text/plain; charset=utf-8',
  }));
  return storageKey;
}

export async function saveFileContent(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<string> {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageKey = `${randomUUID()}-${safeName}`;
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
    Body: buffer,
    ContentType: mimeType ?? 'application/octet-stream',
  }));
  return storageKey;
}

export async function readContent(storageKey: string): Promise<Buffer> {
  const response = await s3.send(new GetObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  }));
  const stream = response.Body as NodeJS.ReadableStream;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function getPresignedUrl(
  storageKey: string,
  expiresInSeconds = 3600
): Promise<string> {
  return getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: BUCKET, Key: storageKey }),
    { expiresIn: expiresInSeconds }
  );
}

export async function deleteContent(storageKey: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: storageKey,
  }));
}