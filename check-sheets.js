const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: '/Users/usuario/Desktop/CRM_NAMI/nami-crm-web/credentials.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = '1yDwJXy_LULzuwObs_EiIwqKHfnmH-CT_TXDZewHyxYA';

sheets.spreadsheets.get({ spreadsheetId }).then(info => {
  console.log('Available Sheets:', info.data.sheets.map(s => s.properties.title));
}).catch(console.error);
