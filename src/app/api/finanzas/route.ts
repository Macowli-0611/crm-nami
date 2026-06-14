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
      range: 'Finanzas!A2:E', // Fetching up to E for Notes
    });

    const rows = response.data.values || [];
    const transactions = rows.map((row, index) => ({
      rowIndex: index + 2, // index 0 starts at row 2
      date: row[0] || '',
      concept: row[1] || '',
      category: row[2] || '',
      amount: parseFloat(row[3]) || 0,
      notes: row[4] || '',
    }));

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsInstance();
    
    // Ensure the header row has the Notes column if it's not present
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Finanzas!A1:E1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Fecha', 'Concepto/Cliente', 'Categoría', 'Monto', 'Notas']]
      }
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Finanzas!A:E',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [body.date, body.concept, body.category, body.amount, body.notes || '']
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
      range: `Finanzas!A${rowIndex}:E${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          [body.date, body.concept, body.category, body.amount, body.notes || '']
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
    const sheetId = await getSheetId(sheets, 'Finanzas');
    if (sheetId === null) {
      return NextResponse.json({ success: false, error: 'Sheet Finanzas not found' }, { status: 404 });
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
