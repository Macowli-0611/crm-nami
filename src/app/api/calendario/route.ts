import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import path from 'path';

export const dynamic = 'force-dynamic';

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
      console.error('Error parsing GOOGLE_SERVICE_ACCOUNT_JSON:', e);
    }
  }
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(process.cwd(), 'credentials.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function ensureCalendarSheet(sheets: any) {
  // Check if the 'Calendario' sheet exists, create it if not
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetExists = spreadsheet.data.sheets?.some(
    (s: any) => s.properties.title === 'Calendario'
  );

  if (!sheetExists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: 'Calendario' },
            },
          },
        ],
      },
    });
  }

  // Ensure headers are present
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: 'Calendario!A1:G1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['ID', 'Título', 'Fecha', 'Hora', 'Lugar', 'Descripción', 'Color']],
    },
  });
}

async function getSheetId(sheets: any, title: string) {
  const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = spreadsheet.data.sheets.find((s: any) => s.properties.title === title);
  return sheet ? sheet.properties.sheetId : null;
}

export async function GET() {
  try {
    const sheets = await getSheetsInstance();
    await ensureCalendarSheet(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Calendario!A2:G',
    });

    const rows = response.data.values || [];
    const events = rows
      .filter((row: string[]) => row[0] && row[1] && row[2]) // must have ID, title, date
      .map((row: string[]) => ({
        id: row[0] || '',
        title: row[1] || '',
        date: row[2] || '',
        time: row[3] || '',
        location: row[4] || '',
        description: row[5] || '',
        color: row[6] || 'blue',
      }));

    return NextResponse.json({ success: true, data: events });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, date, time, location, description, color } = body;

    if (!title || !date) {
      return NextResponse.json(
        { success: false, error: 'title and date are required' },
        { status: 400 }
      );
    }

    const sheets = await getSheetsInstance();
    await ensureCalendarSheet(sheets);

    const id = Date.now().toString();

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Calendario!A:G',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[id, title, date, time || '', location || '', description || '', color || 'blue']],
      },
    });

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, title, date, time, location, description, color } = body;

    if (!id || !title || !date) {
      return NextResponse.json(
        { success: false, error: 'id, title and date are required' },
        { status: 400 }
      );
    }

    const sheets = await getSheetsInstance();
    await ensureCalendarSheet(sheets);

    // Find row with this id
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Calendario!A2:G',
    });

    const rows = response.data.values || [];
    const rowIndexInData = rows.findIndex((row: string[]) => row[0] === id);

    if (rowIndexInData === -1) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const sheetRowIndex = rowIndexInData + 2; // +2 because data starts at row 2 (row 1 is headers)

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Calendario!A${sheetRowIndex}:G${sheetRowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[id, title, date, time || '', location || '', description || '', color || 'blue']],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const sheets = await getSheetsInstance();
    await ensureCalendarSheet(sheets);

    // Find the row
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Calendario!A2:G',
    });

    const rows = response.data.values || [];
    const rowIndexInData = rows.findIndex((row: string[]) => row[0] === id);

    if (rowIndexInData === -1) {
      return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
    }

    const sheetId = await getSheetId(sheets, 'Calendario');
    if (sheetId === null) {
      return NextResponse.json({ success: false, error: 'Calendario sheet not found' }, { status: 404 });
    }

    const sheetRowIndex = rowIndexInData + 1; // 0-indexed for batchUpdate (+1 because headers are row 0)

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: sheetRowIndex,
                endIndex: sheetRowIndex + 1,
              },
            },
          },
        ],
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
