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

export async function GET() {
  try {
    const sheets = await getSheetsInstance();
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Configuración!A2:B100', // Expanded range for safer reads
    });

    const rows = response.data.values || [];
    
    // Default config values
    const config = {
      templates: [] as { id: number; name: string; text: string }[],
      plans: [] as { id: number; name: string; subplans: { id: number; name: string; price: number }[] }[],
      categories: [] as string[],
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
    let plansDataJson = '';
    let financeCategoriesJson = '';
    
    rows.forEach(row => {
      const key = row[0];
      const val = row[1];
      if (key === 'price_plus') legacyPlus = val;
      if (key === 'price_pro') legacyPro = val;
      if (key === 'whatsapp_template') legacyTemplate = val;
      if (key === 'plans_data_json') plansDataJson = val;
      if (key === 'finance_categories_json') financeCategoriesJson = val;
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

    // Parse plans: check JSON key first
    let parsedPlansSuccess = false;
    if (plansDataJson) {
      try {
        const parsed = JSON.parse(plansDataJson);
        if (Array.isArray(parsed)) {
          config.plans = parsed;
          parsedPlansSuccess = true;
        }
      } catch (e) {
        console.error("Error parsing plans_data_json:", e);
      }
    }

    // Fallback if plans_data_json isn't present or failed to parse
    if (!parsedPlansSuccess) {
      // Parse up to 5 plans from legacy structure
      const legacyPlans: { id: number; name: string; price: number }[] = [];
      for (let i = 1; i <= 5; i++) {
        const nameKey = `plan_${i}_name`;
        const priceKey = `plan_${i}_price`;

        const nameRow = rows.find(r => r[0] === nameKey);
        const priceRow = rows.find(r => r[0] === priceKey);

        if (nameRow || priceRow) {
          const nameVal = nameRow?.[1]?.trim() || '';
          const priceVal = priceRow?.[1]?.trim() || '';
          if (nameVal !== '' || priceVal !== '') {
            legacyPlans.push({
              id: i,
              name: nameVal || `Plan ${i}`,
              price: parseFloat(priceVal || '0') || 0
            });
          }
        }
      }

      if (legacyPlans.length === 0) {
        legacyPlans.push({
          id: 1,
          name: "Plus",
          price: legacyPlus ? parseFloat(legacyPlus) || 120 : 120
        });
        legacyPlans.push({
          id: 2,
          name: "Pro",
          price: legacyPro ? parseFloat(legacyPro) || 250 : 250
        });
      }

      // Convert legacy plans to nested plans format
      config.plans = legacyPlans.map((p, idx) => ({
        id: p.id,
        name: p.name,
        subplans: [
          {
            id: 1,
            name: "Estándar",
            price: p.price
          }
        ]
      }));
    }

    // Parse finance categories
    if (financeCategoriesJson) {
      try {
        const parsed = JSON.parse(financeCategoriesJson);
        if (Array.isArray(parsed)) {
          config.categories = parsed;
        }
      } catch (e) {
        console.error("Error parsing finance_categories_json:", e);
      }
    }
    if (config.categories.length === 0) {
      config.categories = ["Planes", "Soporte", "Publicidad", "Servicios", "Suscripciones", "Comisiones", "Sueldos", "Otro"];
    }

    // Set legacy fields for backwards compatibility
    const plusPlan = config.plans.find(p => p.name.toLowerCase() === 'plus') || config.plans[0];
    const proPlan = config.plans.find(p => p.name.toLowerCase() === 'pro') || config.plans[1];
    config.pricePlus = plusPlan && plusPlan.subplans?.[0] ? plusPlan.subplans[0].price : 120;
    config.pricePro = proPlan && proPlan.subplans?.[0] ? proPlan.subplans[0].price : 250;

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

    // Save dynamic nested plans as JSON
    const plans = body.plans || [];
    dataToSave.push(['plans_data_json', JSON.stringify(plans)]);

    // Save dynamic finance categories as JSON
    const categories = body.categories || [];
    dataToSave.push(['finance_categories_json', JSON.stringify(categories)]);

    // Flatten nested plans to keep legacy plan celdas up to 5 for sheet readability
    const flattenedSubplans: { name: string; price: number }[] = [];
    plans.forEach((p: any) => {
      const subplans = p.subplans || [];
      subplans.forEach((sub: any) => {
        flattenedSubplans.push({
          name: sub.name ? `${p.name} - ${sub.name}` : p.name,
          price: sub.price || 0
        });
      });
    });

    for (let i = 1; i <= 5; i++) {
      const flatSub = flattenedSubplans[i - 1];
      if (flatSub) {
        dataToSave.push([`plan_${i}_name`, flatSub.name]);
        dataToSave.push([`plan_${i}_price`, flatSub.price.toString()]);
      } else {
        dataToSave.push([`plan_${i}_name`, '']);
        dataToSave.push([`plan_${i}_price`, '']);
      }
    }

    // Maintain legacy keys for compatibility
    const firstTemplateText = templates[0]?.text || '';
    dataToSave.push(['whatsapp_template', firstTemplateText]);

    const legacyPlusVal = flattenedSubplans.find((s: any) => s.name.toLowerCase().includes('plus')) || flattenedSubplans[0];
    const legacyProVal = flattenedSubplans.find((s: any) => s.name.toLowerCase().includes('pro')) || flattenedSubplans[1];
    const plusPrice = legacyPlusVal ? legacyPlusVal.price : 120;
    const proPrice = legacyProVal ? legacyProVal.price : 250;
    dataToSave.push(['price_plus', plusPrice.toString()]);
    dataToSave.push(['price_pro', proPrice.toString()]);

    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: 'Configuración!A2:B100', // Expanded range for POST too
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
