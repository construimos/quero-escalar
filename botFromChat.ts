import express, { Request, Response } from 'express';
import twilio from 'twilio';
import { google } from 'googleapis';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

//const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!);

const userStates: { [key: string]: any } = {};
const DAYS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];

// Carregue o arquivo de chave da conta de serviço JSON.
const serviceAccount = require('./quero-escalar-62e9c1077326.json');


// Defina os escopos para a API Google Sheets.
const scopes = ['https://www.googleapis.com/auth/spreadsheets'];

// Autentique e autorize o cliente.
const auth = new google.auth.JWT(
    serviceAccount.client_email,
    serviceAccount.private_key,
);

// Crie a instância de sheets.
const sheets = google.sheets({ version: 'v4', auth });

// Funções auxiliares
async function handleStateUpdate(message: string, senderNumber: string, userState: any, nextState: string, nextMessage: string) {
    userState.data[userState.state.toLowerCase()] = message.split(' ');
    userState.state = nextState;
    userStates[senderNumber] = userState;
    sendWhatsAppMessage(senderNumber, nextMessage);
}

// Este metodo deve preencher as colunas referentes aos dias na planilha
// A variavel time pode ter somente 3 valores, 'Manhã', 'Tarde' ou 'Dia todo'
async function handleTime(message: string, senderNumber: string, userState: any) {
    userState.data.time = message.split(' ');

    const row: { [key: string]: any } = {
        Nome: userState.data.name,
        Telefone: userState.data.phoneNumber,
        'Tipo Participante': userState.data.role
    };

    DAYS.forEach(day => {
        row[day] = userState.data.days.includes(day) ? userState.data.time.join(' ') : 'Dia todo';
    });

    // Adicione a linha à planilha.

    const response = await sheets.spreadsheets.values.append({
        spreadsheetId: process.env.GOOGLE_SHEET_ID!,
        range: 'Horarios',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
            values: [
                [Object.values(row)]
            ],
        },
    });

    delete userStates[senderNumber];

    const availableUsers = await getAvailablePrimeirosDeCordada(userState.data.days, userState.data.time, userState.data.role);

    if (userState.data.role === 'Participante') {
        let message = `Existem ${availableUsers.length} Primeiros de Cordada disponíveis no mesmo horário que você.`;
        availableUsers.forEach((user: { Nome: any; availableTimes: any[]; }) => {
            message += `\nNome: ${user.Nome}, Horários: ${user.availableTimes.join(", ")}`;
        });
        sendWhatsAppMessage(senderNumber, message);
    } else if (userState.data.role === 'Primeiro de cordada') {
        let message = `Existem ${availableUsers.length} Participantes disponíveis no mesmo horário que você.`;
        availableUsers.forEach((user: { Nome: any; availableTimes: any[]; }) => {
            message += `\nNome: ${user.Nome}, Horários: ${user.availableTimes.join(", ")}`;
        });
        sendWhatsAppMessage(senderNumber, message);
    }
}

// Melhoria: Dividindo o método getAvailablePrimeirosDeCordada em partes menores
async function getAvailablePrimeirosDeCordada(days: string[], time: string[], role: string) {
    try {
        // Carregando apenas as células que realmente precisamos
        const sheet = doc.sheetsByIndex[0];
        await sheet.loadHeaderRow();

        const rows = await sheet.getRows();

        // Filtrando os usuários disponíveis
        const availableUsers = filterAvailableUsers(rows, days, time, role);

        return availableUsers;
    } catch (error) {
        console.error(`Error during getting available users: ${error}`);
        return [];
    }
}

function filterAvailableUsers(rows: any, days: string[], time: string[], role: string) {
    return rows.filter((row: any) => {
        if (row['Tipo Participante'] !== role) {
            const { availabilityMatches, availableTimes } = checkAvailability(row, days, time);

            if (availabilityMatches) {
                row.availableTimes = availableTimes;
                return true;
            }
        }
        return false;
    });
}

function checkAvailability(row: any, days: string[], time: string[]) {
    let availabilityMatches = false;
    let availableTimes: string[] = [];

    days.forEach(day => {
        if (time.includes(row[day])) {
            availabilityMatches = true;
            availableTimes.push(day + ": " + row[day]);
        }
    });

    return { availabilityMatches, availableTimes };
}

// Processamento de mensagens
async function processMessage(message: string, senderNumber: string) {
    const userState = userStates[senderNumber] ||
    {
        state: 'INIT',
        data: {
            name: '',
            phoneNumber: '',
            role: '',
            days: [],
            time: []
        }
    };

    switch (userState.state) {

        case 'NAME':
            await handleStateUpdate(message, senderNumber, userState, 'INIT', 'Como voce se chama ?');
            break;

        case 'INIT':
            userState.data.name = message;
            userState.data.phoneNumber = senderNumber;
            await handleStateUpdate(message, senderNumber, userState, 'ROLE', 'Você é: \n 1. Participante \n 2. Primeiro de cordada?');
            break;

        case 'ROLE':
            if (message === '1') {
                userState.data.role = 'Participante';
            } else if (message === '2') {
                userState.data.role = 'Primeiro de cordada';
            } else {
                sendWhatsAppMessage(senderNumber, 'Por favor, digite 1 ou 2');
            }
            //todo mexer aqui
            await handleStateUpdate(message, senderNumber, userState, 'DAYS', 'Quais dias da semana você prefere? Multiselect');
            break;

        case 'DAYS':
            userState.data.days = message.trim().split(',');
            await handleStateUpdate(message, senderNumber, userState, 'TIME', 'Qual horário você prefere? Escolha um valor');
            break;

        case 'TIME':
            userState.data.time = message;
            await handleTime(message, senderNumber, userState);
            break;
    }
}

// Implementação do servidor
app.listen(3000, () => console.log('Server is running on port 3000'));

// Tarefa Cron
cron.schedule('* * * * *', function () {
    // Envia uma mensagem para o grupo todo domingo às 16:20
    sendWhatsAppMessage('group_id', `Quer escalar esta semana? Clique aqui: https://api.whatsapp.com/send?phone=${process.env.TWILIO_NUMBER}&text=Oi`);
    updateSubheader();
});

// Este metodo deve receber uma mensagem e um número de telefone e enviar a mensagem para o número de telefone
async function sendWhatsAppMessage(to: string, message: string) {
    await client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_NUMBER}`,
        to: `whatsapp:+5521975707562`
    });
}

async function getUserNameFromWhatsApp(senderNumber: string) {
    // Este metodo deve retornar o nome do usuário a partir do número de telefone
}

async function updateSubheader() {
    // Este metodo deve atualizar a linha 2 da planilha com as datas da semana seguinte
    const nextWeekDates = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i + 1);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    });

    const sheet = doc.sheetsByIndex[0];
    await sheet.loadCells('A2:H2');
    for (let i = 3; i < 10; i++) {
        const cell = sheet.getCell(1, i);
        cell.value = nextWeekDates[i - 3];
    }
    await sheet.saveUpdatedCells();
}
