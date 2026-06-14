const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: '/Users/usuario/Desktop/CRM_NAMI/nami-crm-499111-258ee9503b70.json',
  scopes: ['https://www.googleapis.com/auth/drive.readonly'],
});
const drive = google.drive({ version: 'v3', auth });
drive.files.list({
  fields: 'nextPageToken, files(id, name, mimeType)',
}).then(res => {
  console.log('Files:');
  res.data.files.forEach(file => {
    console.log(`${file.name} (${file.id})`);
  });
}).catch(console.error);
