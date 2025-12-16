// testUpload.js
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const fs = require("fs");

const s3 = new S3Client({
  endpoint: "http://172.23.24.166:9000",
  region: "us-east-1",
  credentials: {
    accessKeyId: "shishir",
    secretAccessKey: "shishir#123",
  },
});

async function testUpload() {
  const fileContent = fs.readFileSync(
    "S:/Techminds/Nextjs/OrgSocial/org-social/public/logo.webp"
  );

  const command = new PutObjectCommand({
    Bucket: "frontend-test-bucket",
    Key: "uploads/test.jpg",
    Body: fileContent,
    ContentType: "image/jpeg",
  });

  try {
    await s3.send(command);
    console.log("Upload successful");
  } catch (err) {
    console.error(err);
  }
}

testUpload();
