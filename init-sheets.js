const { google } = require('googleapis');
const auth = new google.auth.GoogleAuth({
  keyFile: '/Users/usuario/Desktop/CRM_NAMI/nami-crm-499111-258ee9503b70.json',
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const sheets = google.sheets({ version: 'v4', auth });
const spreadsheetId = '1yDwJXy_LULzuwObs_EiIwqKHfnmH-CT_TXDZewHyxYA';

async function init() {
  try {
    const info = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetTitles = info.data.sheets.map(s => s.properties.title);
    const requests = [];

    // Ensure 'Finanzas' exists
    if (!sheetTitles.includes('Finanzas')) {
      requests.push({ addSheet: { properties: { title: 'Finanzas' } } });
    }
    // Ensure 'Configuración' exists
    if (!sheetTitles.includes('Configuración')) {
      requests.push({ addSheet: { properties: { title: 'Configuración' } } });
    }
    
    // Check if 'Clientes' exists, rename if necessary or assume it exists 
    // It should exist as it was converted from Excel.
    
    if (requests.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests }
      });
      console.log('Added new sheets.');
    } else {
      console.log('Sheets already exist.');
    }
    
    // Set Headers for Finanzas
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Finanzas!A1:D1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Fecha', 'Concepto/Cliente', 'Categoría', 'Monto']] }
    });
    console.log('Updated headers for Finanzas');
    
  } catch(e) {
    console.error('Error:', e.message);
  }
}
init();
