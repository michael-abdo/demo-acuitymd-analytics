#!/usr/bin/env node

// Test script for NDA API endpoints
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Mock session for testing in development
process.env.NEXTAUTH_URL = 'http://localhost:3001';
process.env.NODE_ENV = 'development';

// Import Next.js app for testing
async function testAPIs() {
  console.log('🧪 Testing NDA API Endpoints...\n');

  // Test 1: Upload a document
  console.log('1️⃣ Testing Upload Endpoint');
  console.log('   Uploading test PDF...');
  
  const testPdfPath = path.join(__dirname, 'documents/third-party/UK-Government-Mutual-NDA.pdf');
  
  try {
    const form = new FormData();
    form.append('file', fs.createReadStream(testPdfPath));
    form.append('isStandard', 'false');
    
    const uploadResponse = await fetch('http://localhost:3001/api/upload', {
      method: 'POST',
      body: form,
      headers: {
        ...form.getHeaders(),
      }
    });
    
    const uploadResult = await uploadResponse.text();
    console.log('   Response:', uploadResponse.status, uploadResult.substring(0, 100));
    
  } catch (error) {
    console.log('   ❌ Upload failed:', error.message);
  }

  // Test 2: List documents
  console.log('\n2️⃣ Testing Documents List Endpoint');
  
  try {
    const listResponse = await fetch('http://localhost:3001/api/documents');
    const listResult = await listResponse.text();
    console.log('   Response:', listResponse.status, listResult.substring(0, 100));
    
  } catch (error) {
    console.log('   ❌ List failed:', error.message);
  }

  // Test 3: Get document by ID
  console.log('\n3️⃣ Testing Get Document Endpoint');
  
  try {
    const getResponse = await fetch('http://localhost:3001/api/documents/1');
    const getResult = await getResponse.text();
    console.log('   Response:', getResponse.status, getResult.substring(0, 100));
    
  } catch (error) {
    console.log('   ❌ Get failed:', error.message);
  }

  // Test 4: Storage health
  console.log('\n4️⃣ Testing Storage Health');
  
  try {
    const healthResponse = await fetch('http://localhost:3001/api/storage-health');
    const healthResult = await healthResponse.text();
    console.log('   Response:', healthResponse.status, healthResult.substring(0, 100));
    
  } catch (error) {
    console.log('   ❌ Health check failed:', error.message);
  }

  console.log('\n✅ Testing complete!');
  console.log('\nNote: All endpoints are redirecting to /sign-in because they require authentication.');
  console.log('To test with authentication, you need to:');
  console.log('1. Go to http://localhost:3001/sign-in');
  console.log('2. Sign in with Azure AD');
  console.log('3. Use browser DevTools to test authenticated endpoints');
}

// Run tests
testAPIs().catch(console.error);