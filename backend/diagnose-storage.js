const admin = require('firebase-admin');
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin SDK (same as in app.js)
initializeApp({
  credential: applicationDefault(),
  projectId: 'studio-9824031244-700aa',
  storageBucket: 'studio-9824031244-700aa.firebasestorage.app',
});

async function diagnoseStorage() {
  console.log('=== FIREBASE STORAGE DIAGNOSTIC ===\n');

  try {
    // 1. Verificar bucket
    console.log('1. Checking bucket connection...');
    const bucket = getStorage().bucket();
    console.log('   ✅ Bucket name:', bucket.name);

    // 2. Verificar que el bucket existe
    console.log('\n2. Checking if bucket exists...');
    const [bucketExists] = await bucket.exists();
    console.log('   ✅ Bucket exists:', bucketExists);

    if (!bucketExists) {
      console.log('   ❌ ERROR: Bucket does not exist!');
      console.log('   Check Firebase Console > Storage');
      return;
    }

    // 3. Listar archivos en la carpeta 'productos'
    console.log('\n3. Listing files in "productos/" folder...');
    const [files] = await bucket.getFiles({ prefix: 'productos/' });

    if (files.length === 0) {
      console.log('   ⚠️  No files found in productos/ folder');
      console.log('   Upload a file first using the upload endpoint');
    } else {
      console.log(`   ✅ Found ${files.length} file(s):`);
      files.slice(0, 5).forEach((file, index) => {
        console.log(`      ${index + 1}. ${file.name}`);
      });
      if (files.length > 5) {
        console.log(`      ... and ${files.length - 5} more`);
      }

      // 4. Test file.exists() con el primer archivo
      if (files.length > 0) {
        const testFilePath = files[0].name;
        console.log(`\n4. Testing file.exists() with: ${testFilePath}`);

        const testFile = bucket.file(testFilePath);
        const [exists] = await testFile.exists();
        console.log('   ✅ file.exists() returned:', exists);

        if (!exists) {
          console.log('   ❌ ERROR: file.exists() returned false for existing file!');
          console.log('   This indicates a permissions problem.');
        }

        // 5. Test getSignedUrl()
        if (exists) {
          console.log('\n5. Testing getSignedUrl()...');
          try {
            const expiresAt = Date.now() + 5 * 60 * 1000;
            const [signedUrl] = await testFile.getSignedUrl({
              action: 'read',
              expires: expiresAt,
            });
            console.log('   ✅ Signed URL generated successfully');
            console.log('   URL:', signedUrl.substring(0, 100) + '...');
          } catch (error) {
            console.log('   ❌ ERROR generating signed URL:', error.message);
          }
        }
      }
    }

    // 6. Verificar permisos de la cuenta de servicio
    console.log('\n6. Checking service account permissions...');
    try {
      const email = admin.app().options.credential.getAccessToken().then(token => {
        console.log('   ✅ Service account authenticated');
      }).catch(err => {
        console.log('   ❌ Auth error:', err.message);
      });
    } catch (error) {
      console.log('   ℹ️  Could not check service account details');
    }

    console.log('\n=== DIAGNOSTIC COMPLETE ===');
    console.log('\nIf all checks passed, the issue might be:');
    console.log('1. The filePath sent from frontend doesn\'t match the actual file path');
    console.log('2. The file was uploaded to a different bucket');
    console.log('3. Race condition (file not yet visible after upload)');

  } catch (error) {
    console.error('\n❌ DIAGNOSTIC FAILED:');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    // Cleanup
    await admin.app().delete();
    process.exit(0);
  }
}

// Run diagnostic
diagnoseStorage();
