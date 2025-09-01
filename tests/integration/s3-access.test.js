/**
 * S3 Access Test (Fail Fast)
 */

async function testS3Access() {
  console.log('☁️ Testing S3 connectivity...');
  
  const requiredEnvs = ['AWS_REGION', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'S3_BUCKET_NAME'];
  for (const env of requiredEnvs) {
    if (!process.env[env]) {
      console.error(`❌ FATAL: ${env} not configured`);
      process.exit(1);
    }
  }
  
  try {
    const { S3Client, HeadBucketCommand, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
    
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
    
    // Test bucket access
    await s3.send(new HeadBucketCommand({ Bucket: process.env.S3_BUCKET_NAME }));
    console.log('✅ S3 bucket accessible');
    
    // Test upload/delete
    const testKey = 'test/connection-test.txt';
    await s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: testKey,
      Body: 'Test upload'
    }));
    console.log('✅ S3 upload successful');
    
    await s3.send(new DeleteObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: testKey
    }));
    console.log('✅ S3 delete successful');
    
    console.log('✅ S3 access test passed');
    
  } catch (error) {
    console.error('❌ FATAL: S3 access test failed');
    console.error(`💡 Error: ${error.message}`);
    console.error('💡 Check AWS credentials and S3 bucket configuration');
    process.exit(1);
  }
}

// Run test if called directly
if (require.main === module) {
  testS3Access();
}

module.exports = { testS3Access };