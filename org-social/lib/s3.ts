import { S3Client } from "@aws-sdk/client-s3";

export const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT!,
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY!,
    secretAccessKey: process.env.S3_SECRET_KEY!,
  },
  forcePathStyle: true,
  
});
console.log("S3 env lengths:", {
  access: (process.env.S3_ACCESS_KEY ?? "").length,
  secret: (process.env.S3_SECRET_KEY ?? "").length,
});
