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
    let parsedPlans: any[] = [];
    let legacyPlans: { name: string; price: number }[] = [];

    try {
      const configRes = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Configuración!A2:B100',
      });
      const configRows = configRes.data.values || [];
      
      const plansDataJsonRow = configRows.find((r: any) => r[0] === 'plans_data_json');
      if (plansDataJsonRow?.[1]) {
        try {
          const parsed = JSON.parse(plansDataJsonRow[1]);
          if (Array.isArray(parsed)) {
            parsedPlans = parsed;
          }
        } catch (e) {
          console.error("Error parsing plans_data_json inside cobrar route:", e);
        }
      }

      // Load legacy plans just in case of fallback
      for (let i = 1; i <= 5; i++) {
        const nameKey = `plan_${i}_name`;
        const priceKey = `plan_${i}_price`;
        const nameRow = configRows.find((r: any) => r[0] === nameKey);
        const priceRow = configRows.find((r: any) => r[0] === priceKey);
        if (nameRow || priceRow) {
          const nameVal = nameRow?.[1]?.trim() || '';
          const priceVal = priceRow?.[1]?.trim() || '';
          if (nameVal !== '' || priceVal !== '') {
            legacyPlans.push({
              name: nameVal || `Plan ${i}`,
              price: parseFloat(priceVal || '0') || 0
            });
          }
        }
      }

      if (legacyPlans.length === 0) {
        const legacyPlus = configRows.find((r: any) => r[0] === 'price_plus')?.[1];
        const legacyPro = configRows.find((r: any) => r[0] === 'price_pro')?.[1];
        legacyPlans.push({ name: "Plus", price: legacyPlus ? parseFloat(legacyPlus) || 120 : 120 });
        legacyPlans.push({ name: "Pro", price: legacyPro ? parseFloat(legacyPro) || 250 : 250 });
      }
    } catch (e) {
      console.error("Error loading config inside cobrar:", e);
    }

    // Resolve price (supporting multiple comma-separated plans)
    const planString = plan || '';
    const plansList = planString.split(',').map((p: string) => p.trim()).filter(Boolean);

    amount = 0;

    for (const planItem of plansList) {
      const planLower = planItem.toLowerCase();
      let priceFound = false;
      let itemAmount = 0;

      // 1. Try to find match in parsed nested plans
      if (parsedPlans.length > 0) {
        for (const p of parsedPlans) {
          if (p.subplans) {
            for (const sub of p.subplans) {
              const fullDescriptor = `${p.name} - ${sub.name}`.toLowerCase();
              if (planLower === fullDescriptor || planLower === `plan ${fullDescriptor}`) {
                itemAmount = sub.price;
                priceFound = true;
                break;
              }
            }
          }
          if (priceFound) break;
        }

        // If no subplan matches but it matches the main plan name, default to its first subplan's price
        if (!priceFound) {
          const matchedParent = parsedPlans.find(p => planLower === p.name.toLowerCase() || planLower === `plan ${p.name.toLowerCase()}`);
          if (matchedParent && matchedParent.subplans?.[0]) {
            itemAmount = matchedParent.subplans[0].price;
            priceFound = true;
          }
        }
      }

      // 2. Try legacy fallback match
      if (!priceFound) {
        const matchedLegacy = legacyPlans.find(p => p.name.toLowerCase() === planLower);
        if (matchedLegacy) {
          itemAmount = matchedLegacy.price;
          priceFound = true;
        }
      }

      // 3. Last resort general fallbacks
      if (!priceFound) {
        if (planLower.includes('pro')) {
          itemAmount = legacyPlans.find(p => p.name.toLowerCase() === 'pro')?.price || 250;
        } else if (planLower.includes('plus')) {
          itemAmount = legacyPlans.find(p => p.name.toLowerCase() === 'plus')?.price || 120;
        } else if (planLower === 'custom') {
          itemAmount = 120; // default backup for Custom
        } else {
          itemAmount = 120; // default backup
        }
      }

      amount += itemAmount;
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
