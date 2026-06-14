import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID || '1yDwJXy_LULzuwObs_EiIwqKHfnmH-CT_TXDZewHyxYA';

async function getSheetsInstance() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      return google.sheets({ version: 'v4', auth });
    } catch (e) {
      console.error("Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:", e);
    }
  }

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function getSheetId(sheets: any, title: string) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets.find((s: any) => s.properties.title === title);
  return sheet ? sheet.properties.sheetId : null;
}

export async function GET() {
  try {
    const sheets = await getSheetsInstance();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Clientes!A3:M', // Expanded from L to M to include payDate
    });

    const rows = response.data.values || [];
    // Skipping header row
    const clientsRows = rows.slice(1);
    
    const clients = clientsRows.map((row, index) => ({
      rowIndex: index + 4, // index 0 starts at row 4
      name: row[0] || '',
      type: row[1] || '',
      zone: row[2] || '',
      phone: row[3] || '',
      contactName: row[4] || '',
      status: row[5] || '',
      interest: row[6] || '',
      nextAction: row[7] || '',
      testMonths: row[8] || '',
      notes: row[9] || '',
      message: row[10] || '',
      plan: row[11] || '',
      payDate: row[12] || '', // Column M
    }));

    return NextResponse.json({ success: true, data: clients });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsInstance();
    
    // Ensure header has the payDate column on row 3
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Clientes!A3:M3',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            'Nombre del lugar',
            'Tipo negocio',
            'Zona/Barrio',
            'Teléfono / WhatsApp',
            'Contacto (persona)',
            'Estado',
            'Interés',
            'Próxima acción',
            'Meses de Prueba',
            'Notas',
            'MENSAJE',
            'Plan',
            'Fecha de Pago' // Added header for Column M
          ]
        ]
      }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Clientes!A:M',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            body.name || '', 
            body.type || '', 
            body.zone || '', 
            body.phone || '', 
            body.contactName || '', 
            body.status || 'Prospecto', 
            body.interest || '',
            body.nextAction || '', 
            body.testMonths || '', 
            body.notes || '', 
            body.message || '',
            body.plan || '', 
            body.payDate || '' // Column M
          ]
        ]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { rowIndex } = body;
    if (!rowIndex) {
      return NextResponse.json({ success: false, error: 'rowIndex is required' }, { status: 400 });
    }
    const sheets = await getSheetsInstance();
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Clientes!A${rowIndex}:M${rowIndex}`, // Updated to column M
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [
            body.name || '',
            body.type || '',
            body.zone || '',
            body.phone || '',
            body.contactName || '',
            body.status || '',
            body.interest || '',
            body.nextAction || '',
            body.testMonths || '',
            body.notes || '',
            body.message || '',
            body.plan || '',
            body.payDate || '' // Column M
          ]
        ]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rowIndex = parseInt(searchParams.get('rowIndex') || '');
    if (!rowIndex || isNaN(rowIndex)) {
      return NextResponse.json({ success: false, error: 'Valid rowIndex is required' }, { status: 400 });
    }
    const sheets = await getSheetsInstance();
    const sheetId = await getSheetId(sheets, 'Clientes');
    if (sheetId === null) {
      return NextResponse.json({ success: false, error: 'Sheet Clientes not found' }, { status: 404 });
    }

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex - 1, // 0-indexed
                endIndex: rowIndex
              }
            }
          }
        ]
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
