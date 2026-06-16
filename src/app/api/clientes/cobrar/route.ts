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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { rowIndex, name, plan, payDate } = body;

    if (!rowIndex || !plan) {
      return NextResponse.json({ success: false, error: 'rowIndex and plan are required' }, { status: 400 });
    }

    const sheets = await getSheetsInstance();

    // 1. Calculate next payment date (add 1 month)
    let baseDate = new Date();
    if (payDate) {
      const parsed = new Date(payDate);
      if (!isNaN(parsed.getTime())) {
        baseDate = parsed;
      }
    }
    
    // Increment month
    baseDate.setMonth(baseDate.getMonth() + 1);
    const nextPayDateStr = baseDate.toISOString().split('T')[0]; // YYYY-MM-DD

    // 2. Update Column M (Fecha de Pago) in Clientes sheet
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `Clientes!M${rowIndex}:M${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[nextPayDateStr]]
      }
    });

    // 3. Determine pricing value of the plan dynamically from Config
    let amount = 0;
    let plans: { name: string; price: number }[] = [];

    try {
      const configRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Configuración!A2:B30',
      });
      const configRows = configRes.data.values || [];
      
      // Look for custom plans first
      for (let i = 1; i <= 5; i++) {
        const nameKey = `plan_${i}_name`;
        const priceKey = `plan_${i}_price`;
        const nameRow = configRows.find((r: any) => r[0] === nameKey);
        const priceRow = configRows.find((r: any) => r[0] === priceKey);
        if (nameRow || priceRow) {
          const nameVal = nameRow?.[1]?.trim() || '';
          const priceVal = priceRow?.[1]?.trim() || '';
          // Only include if name or price is non-empty
          if (nameVal !== '' || priceVal !== '') {
            plans.push({
              name: nameVal || `Plan ${i}`,
              price: parseFloat(priceVal || '0') || 0
            });
          }
        }
      }

      // If no plans found, fall back to legacy keys
      if (plans.length === 0) {
        const legacyPlus = configRows.find((r: any) => r[0] === 'price_plus')?.[1];
        const legacyPro = configRows.find((r: any) => r[0] === 'price_pro')?.[1];
        plans.push({ name: "Plus", price: legacyPlus ? parseFloat(legacyPlus) || 120 : 120 });
        plans.push({ name: "Pro", price: legacyPro ? parseFloat(legacyPro) || 250 : 250 });
      }
    } catch (e) {
      console.error("Error loading config inside cobrar:", e);
    }

    // Find the exact plan price
    const matchedPlan = plans.find(p => p.name.toLowerCase() === plan.toLowerCase());
    if (matchedPlan) {
      amount = matchedPlan.price;
    } else {
      // General fallbacks if plan name contains 'pro' or 'plus'
      const planLower = plan.toLowerCase();
      if (planLower.includes('pro')) {
        amount = plans.find(p => p.name.toLowerCase() === 'pro')?.price || 250;
      } else if (planLower.includes('plus')) {
        amount = plans.find(p => p.name.toLowerCase() === 'plus')?.price || 120;
      } else {
        amount = 120; // default backup
      }
    }

    // 4. Record income in Finanzas sheet
    const todayStr = new Date().toLocaleDateString('es-ES'); // DD/MM/YYYY

    // Ensure headers are present
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
          [
            todayStr,
            `Mensualidad: ${name} (${plan})`,
            'Planes',
            amount,
            `Cobro mensual procesado. Próxima fecha: ${nextPayDateStr}`
          ]
        ]
      }
    });

    return NextResponse.json({ success: true, nextPayDate: nextPayDateStr, amountRecorded: amount });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
