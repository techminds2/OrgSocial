import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  endpoint: "http://172.23.24.166:9000",
  region: "us-east-1", // REQUIRED but ignored by MinIO
  credentials: {
    accessKeyId: "shishir",
    secretAccessKey: "shishir#123",
  },
  forcePathStyle: true,
});