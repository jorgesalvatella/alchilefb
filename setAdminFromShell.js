const admin = require('firebase-admin');

// Initialize the app. When running in a Google Cloud environment like Cloud Shell,
// the SDK automatically finds the project credentials.
admin.initializeApp({
  projectId: 'studio-9824031244-700aa',
});

// --- Get the UID from command-line arguments ---
const targetUid = process.argv[2];

if (!targetUid) {
  console.error('\nERROR: You must provide the UID of the user as a command-line argument.');
  console.error('Example: node setAdminFromShell.js <some-user-uid>\n');
  process.exit(1);
}

(async () => {
  try {
    console.log(`Setting super-admin claim for user: ${targetUid}`);
    
    // Set the custom claim 'super_admin' to true for the specified user.
    await admin.auth().setCustomUserClaims(targetUid, { super_admin: true });

    console.log('\n✅ Success!');
    console.log(`User ${targetUid} has been made a super-admin.`);
    console.log('You can now log out and log back into the web app to see the changes.');

  } catch (error) {
    console.error('\n❌ Error setting custom claim:', error.message);
    process.exit(1);
  }
})();

