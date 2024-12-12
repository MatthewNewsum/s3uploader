// src/utils/s3.ts
import { S3Client, PutObjectCommand, ListObjectsCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getCurrentUser, getAwsCredentials } from './auth';

const getS3Client = async () => {
  const user = await getCurrentUser();
  if (!user) throw new Error('No authenticated user');

  return new Promise((resolve, reject) => {
    user.getSession(async (err, session) => {
      if (err) reject(err);
      if (!session) reject(new Error('No valid session'));

      const credentials = await getAwsCredentials(session);
      
      const client = new S3Client({
        region: process.env.NEXT_PUBLIC_AWS_REGION,
        credentials
      });

      resolve(client);
    });
  });
};

export const uploadFile = async (file: File) => {
  const client = await getS3Client() as S3Client;
  const key = `${Date.now()}-${file.name}`;

  const command = new PutObjectCommand({
    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
    Key: key,
    Body: file,
    ContentType: file.type
  });

  await client.send(command);
  return key;
};

export const listFiles = async () => {
  const client = await getS3Client() as S3Client;

  const command = new ListObjectsCommand({
    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET
  });

  const response = await client.send(command);
  return response.Contents || [];
};

export const deleteFile = async (key: string) => {
  const client = await getS3Client() as S3Client;

  const command = new DeleteObjectCommand({
    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
    Key: key
  });

  await client.send(command);
};

export const getSignedDownloadUrl = async (key: string) => {
  const client = await getS3Client() as S3Client;

  const command = new GetObjectCommand({
    Bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
    Key: key
  });

  return getSignedUrl(client, command, { expiresIn: 3600 });
};