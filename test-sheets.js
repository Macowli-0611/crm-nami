const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: '/Users/usuario/Desktop/CRM_NAMI/nami-crm-499111-258ee9503b70.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
sheets.spreadsheets.values.get({
  spreadsheetId: '1Onq_Fz46OIIiQaMalJq6xXoZtGFm2gLU',
  range: 'Clientes!A3:K5',
}).then(res => {
  console.log('Data:');
  console.log(res.data.values);
}).catch(console.error);
