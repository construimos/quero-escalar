"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const twilio_1 = __importDefault(require("twilio"));
const google_spreadsheet_1 = require("google-spreadsheet");
const node_cron_1 = __importDefault(require("node-cron"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
const client = (0, twilio_1.default)(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const doc = new google_spreadsheet_1.GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
const userStates = {};
const DAYS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
// Funções auxiliares
function handleStateUpdate(message, senderNumber, userState, nextState, nextMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        userState.data[userState.state.toLowerCase()] = message.split(' ');
        userState.state = nextState;
        userStates[senderNumber] = userState;
        sendWhatsAppMessage(senderNumber, nextMessage);
    });
}
// Este metodo deve preencher as colunas referentes aos dias na planilha
// A variavel time pode ter somente 3 valores, 'Manhã', 'Tarde' ou 'Dia todo'
function handleTime(message, senderNumber, userState) {
    return __awaiter(this, void 0, void 0, function* () {
        userState.data.time = message.split(' ');
        const sheet = doc.sheetsByIndex[0];
        const row = {
            Nome: userState.data.name,
            Telefone: userState.data.phoneNumber,
            'Tipo Participante': userState.data.role
        };
        DAYS.forEach(day => {
            row[day] = userState.data.days.includes(day) ? userState.data.time.join(' ') : 'Dia todo';
        });
        yield sheet.addRow(row);
        delete userStates[senderNumber];
        const availableUsers = yield getAvailablePrimeirosDeCordada(userState.data.days, userState.data.time, userState.data.role);
        if (userState.data.role === 'Participante') {
            let message = `Existem ${availableUsers.length} Primeiros de Cordada disponíveis no mesmo horário que você.`;
            availableUsers.forEach((user) => {
                message += `\nNome: ${user.Nome}, Horários: ${user.availableTimes.join(", ")}`;
            });
            sendWhatsAppMessage(senderNumber, message);
        }
        else if (userState.data.role === 'Primeiro de cordada') {
            let message = `Existem ${availableUsers.length} Participantes disponíveis no mesmo horário que você.`;
            availableUsers.forEach((user) => {
                message += `\nNome: ${user.Nome}, Horários: ${user.availableTimes.join(", ")}`;
            });
            sendWhatsAppMessage(senderNumber, message);
        }
    });
}
// Melhoria: Dividindo o método getAvailablePrimeirosDeCordada em partes menores
function getAvailablePrimeirosDeCordada(days, time, role) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Carregando apenas as células que realmente precisamos
            const sheet = doc.sheetsByIndex[0];
            yield sheet.loadHeaderRow();
            const rows = yield sheet.getRows();
            // Filtrando os usuários disponíveis
            const availableUsers = filterAvailableUsers(rows, days, time, role);
            return availableUsers;
        }
        catch (error) {
            console.error(`Error during getting available users: ${error}`);
            return [];
        }
    });
}
function filterAvailableUsers(rows, days, time, role) {
    return rows.filter((row) => {
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
function checkAvailability(row, days, time) {
    let availabilityMatches = false;
    let availableTimes = [];
    days.forEach(day => {
        if (time.includes(row[day])) {
            availabilityMatches = true;
            availableTimes.push(day + ": " + row[day]);
        }
    });
    return { availabilityMatches, availableTimes };
}
// Processamento de mensagens
function processMessage(message, senderNumber) {
    return __awaiter(this, void 0, void 0, function* () {
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
                yield handleStateUpdate(message, senderNumber, userState, 'INIT', 'Como voce se chama ?');
                break;
            case 'INIT':
                userState.data.name = message;
                userState.data.phoneNumber = senderNumber;
                yield handleStateUpdate(message, senderNumber, userState, 'ROLE', 'Você é: \n 1. Participante \n 2. Primeiro de cordada?');
                break;
            case 'ROLE':
                if (message === '1') {
                    userState.data.role = 'Participante';
                }
                else if (message === '2') {
                    userState.data.role = 'Primeiro de cordada';
                }
                else {
                    sendWhatsAppMessage(senderNumber, 'Por favor, digite 1 ou 2');
                }
                //todo mexer aqui
                yield handleStateUpdate(message, senderNumber, userState, 'DAYS', 'Quais dias da semana você prefere? Multiselect');
                break;
            case 'DAYS':
                userState.data.days = message.trim().split(',');
                yield handleStateUpdate(message, senderNumber, userState, 'TIME', 'Qual horário você prefere? Escolha um valor');
                break;
            case 'TIME':
                userState.data.time = message;
                yield handleTime(message, senderNumber, userState);
                break;
        }
    });
}
// Implementação do servidor
app.listen(3000, () => console.log('Server is running on port 3000'));
// Tarefa Cron
node_cron_1.default.schedule('* * * * *', function () {
    // Envia uma mensagem para o grupo todo domingo às 16:20
    sendWhatsAppMessage('group_id', `Quer escalar esta semana? Clique aqui: https://api.whatsapp.com/send?phone=${process.env.TWILIO_NUMBER}&text=Oi`);
    updateSubheader();
});
// Este metodo deve receber uma mensagem e um número de telefone e enviar a mensagem para o número de telefone
function sendWhatsAppMessage(to, message) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_NUMBER}`,
            to: `whatsapp:+5521975707562`
        });
    });
}
function getUserNameFromWhatsApp(senderNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        // Este metodo deve retornar o nome do usuário a partir do número de telefone
    });
}
function updateSubheader() {
    return __awaiter(this, void 0, void 0, function* () {
        // Este metodo deve atualizar a linha 2 da planilha com as datas da semana seguinte
        const nextWeekDates = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() + i + 1);
            return `${d.getDate()}/${d.getMonth() + 1}`;
        });
        const sheet = doc.sheetsByIndex[0];
        yield sheet.loadCells('A2:H2');
        for (let i = 3; i < 10; i++) {
            const cell = sheet.getCell(1, i);
            cell.value = nextWeekDates[i - 3];
        }
        yield sheet.saveUpdatedCells();
    });
}
