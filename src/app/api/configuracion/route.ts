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

export async function GET() {
  try {
    const sheets = await getSheetsInstance();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Configuración!A2:B30',
    });

    const rows = response.data.values || [];
    
    // Default config values
    const config = {
      templates: [] as { id: number; name: string; text: string }[],
      plans: [] as { id: number; name: string; price: number }[],
      pricePlus: 120,
      pricePro: 250,
    };

    const defaultTemplateText = `¡Hola [NOMBRE]! 👋
Te saludamos desde Ñami.

Muchas gracias por el interés en nuestro sistema para restaurantes 🍽️

Conece más en: 🌐 www.ñami.app

Estás en nuestra lista especial para formar parte de los primeros restaurantes con acceso gratis durante [MESES] meses 🎉

Quedo atento 😊`;

    let legacyTemplate = '';
    let legacyPlus = '';
    let legacyPro = '';
    
    rows.forEach(row => {
      const key = row[0];
      const val = row[1];
      if (key === 'price_plus') legacyPlus = val;
      if (key === 'price_pro') legacyPro = val;
      if (key === 'whatsapp_template') legacyTemplate = val;
    });

    // Parse up to 5 templates
    for (let i = 1; i <= 5; i++) {
      const nameKey = `whatsapp_template_${i}_name`;
      const textKey = `whatsapp_template_${i}_text`;
      
      const nameRow = rows.find(r => r[0] === nameKey);
      const textRow = rows.find(r => r[0] === textKey);
      
      if (nameRow || textRow) {
        const nameVal = nameRow?.[1]?.trim() || '';
        const textVal = textRow?.[1]?.trim() || '';
        // Only include if name or text is non-empty
        if (nameVal !== '' || textVal !== '') {
          config.templates.push({
            id: i,
            name: nameVal || `Plantilla ${i}`,
            text: textVal || ''
          });
        }
      }
    }

    // Fallback if no structured templates exist
    if (config.templates.length === 0) {
      if (legacyTemplate) {
        config.templates.push({
          id: 1,
          name: "General",
          text: legacyTemplate
        });
      } else {
        config.templates.push({
          id: 1,
          name: "Contacto Inicial",
          text: defaultTemplateText
        });
        config.templates.push({
          id: 2,
          name: "Presentación Corta",
          text: `¡Hola [NOMBRE]! 👋 Te saluda el equipo de Ñami.\n\nNos encantaría agendar una cita para presentarte nuestra app para el restaurante [LUGAR].\n\n¿Te interesaría probarlo gratis por [MESES] meses?`
        });
      }
    }

    // Parse up to 5 plans
    for (let i = 1; i <= 5; i++) {
      const nameKey = `plan_${i}_name`;
      const priceKey = `plan_${i}_price`;

      const nameRow = rows.find(r => r[0] === nameKey);
      const priceRow = rows.find(r => r[0] === priceKey);

      if (nameRow || priceRow) {
        const nameVal = nameRow?.[1]?.trim() || '';
        const priceVal = priceRow?.[1]?.trim() || '';
        // Only include if name or price is non-empty
        if (nameVal !== '' || priceVal !== '') {
          config.plans.push({
            id: i,
            name: nameVal || `Plan ${i}`,
            price: parseFloat(priceVal || '0') || 0
          });
        }
      }
    }

    // Fallback if no structured plans exist
    if (config.plans.length === 0) {
      config.plans.push({
        id: 1,
        name: "Plus",
        price: legacyPlus ? parseFloat(legacyPlus) || 120 : 120
      });
      config.plans.push({
        id: 2,
        name: "Pro",
        price: legacyPro ? parseFloat(legacyPro) || 250 : 250
      });
    }

    // Set legacy fields for backwards compatibility
    const plusPlan = config.plans.find(p => p.name.toLowerCase() === 'plus') || config.plans[0];
    const proPlan = config.plans.find(p => p.name.toLowerCase() === 'pro') || config.plans[1];
    config.pricePlus = plusPlan ? plusPlan.price : 120;
    config.pricePro = proPlan ? proPlan.price : 250;

    return NextResponse.json({ success: true, data: config });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sheets = await getSheetsInstance();

    // 1. Ensure headers
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Configuración!A1:B1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['Clave', 'Valor']]
      }
    });

    // 2. Prepare data to save (templates and plans)
    const dataToSave: string[][] = [];

    // Save templates
    const templates = body.templates || [];
    for (let i = 1; i <= 5; i++) {
      const template = templates[i - 1];
      if (template) {
        dataToSave.push([`whatsapp_template_${i}_name`, template.name || '']);
        dataToSave.push([`whatsapp_template_${i}_text`, template.text || '']);
      } else {
        dataToSave.push([`whatsapp_template_${i}_name`, '']);
        dataToSave.push([`whatsapp_template_${i}_text`, '']);
      }
    }

    // Save plans
    const plans = body.plans || [];
    for (let i = 1; i <= 5; i++) {
      const plan = plans[i - 1];
      if (plan) {
        dataToSave.push([`plan_${i}_name`, plan.name || '']);
        dataToSave.push([`plan_${i}_price`, (plan.price || 0).toString()]);
      } else {
        dataToSave.push([`plan_${i}_name`, '']);
        dataToSave.push([`plan_${i}_price`, '']);
      }
    }

    // Maintain legacy keys for compatibility
    const firstTemplateText = templates[0]?.text || '';
    dataToSave.push(['whatsapp_template', firstTemplateText]);

    const plusPlan = plans.find((p: any) => p.name.toLowerCase() === 'plus') || plans[0];
    const proPlan = plans.find((p: any) => p.name.toLowerCase() === 'pro') || plans[1];
    const plusPrice = plusPlan ? plusPlan.price : 120;
    const proPrice = proPlan ? proPlan.price : 250;
    dataToSave.push(['price_plus', plusPrice.toString()]);
    dataToSave.push(['price_pro', proPrice.toString()]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Configuración!A2:B30',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: dataToSave
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
