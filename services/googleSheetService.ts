import { google } from 'googleapis';
import { GoogleSpreadsheet } from 'google-spreadsheet';
/*

const serviceAccount = require('./quero-escalar-62e9c1077326.json');

const auth = new google.auth.JWT(serviceAccount.client_email, serviceAccount.private_key);

*/

const {GoogleAuth} = require('google-auth-library');
const auth = new GoogleAuth({
    keyFile: 'C:\\Dev\\quero-escalar\\quero-escalar-62e9c1077326.json',
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
});


const sheets = google.sheets({ version: 'v4', auth });
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!);

async function appendRowToSheet(row: any[]) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId: process.env.GOOGLE_SHEET_ID!,
            range: 'Horarios',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: {
                values: [
                    row
                ],
            },
        });
    } catch (error) {
        console.error('Error while appending row to sheet', error);
    }
}

async function getAvailableUsers(days: string[], time: string[], role: string) {
    try {
        // carrega apenas as células necessárias
        await doc.loadInfo();
        const sheet = doc.sheetsByIndex[0];
        await sheet.loadHeaderRow();
        const rows = await sheet.getRows();

        // Filtra baseado nas condições...
    } catch (error) {
        console.error('Error while fetching available users', error);
    }
}

async function updateSubheader() {
    try {
        const nextWeekDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        });

        const sheet = doc.sheetsByIndex[0];
        await sheet.loadCells('A2:J2');

        for (let i = 3; i < 10; i++) {
            const cell = sheet.getCell(1, i);
            cell.value = nextWeekDates[i - 3];
        }

        await sheet.saveUpdatedCells();
    } catch (error) {
        console.error('Error while updating subheader', error);
    }
}

export { appendRowToSheet, getAvailableUsers, updateSubheader };
