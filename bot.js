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
// variavel data que vai ser usada para armazenar os valores a serem preenchidos na planilha
const dataPlanilha = {
    name: '',
    phoneNumber: '',
    role: '',
    days: [],
    time: []
};
function accessSpreadsheet() {
    return __awaiter(this, void 0, void 0, function* () {
        yield doc.useServiceAccountAuth({
            client_email: process.env.GOOGLE_CLIENT_EMAIL,
            private_key: process.env.GOOGLE_PRIVATE_KEY
        });
        yield doc.loadInfo();
    });
}
function updateSubheader() {
    return __awaiter(this, void 0, void 0, function* () {
        // Atualiza o subheader da planilha com as datas da próxima semana
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
accessSpreadsheet();
node_cron_1.default.schedule('* * * * *', function () {
    // Envia uma mensagem para o grupo todo domingo às 16:20
    sendWhatsAppMessage('group_id', `Quer escalar esta semana? Clique aqui: https://api.whatsapp.com/send?phone=${process.env.TWILIO_NUMBER}&text=Oi`);
    updateSubheader();
});
app.post('/webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const message = req.body.Body;
    const senderNumber = req.body.From;
    yield processMessage(message, senderNumber);
    // Substitui a criação de um MessagingResponse por uma string XML simples
    const twiml = `
    <?xml version="1.0" encoding="UTF-8"?>
    <Response>
        <Message></Message>
    </Response>
  `;
    // Configura o tipo de conteúdo para 'text/xml' e envia o twiml
    res.type('text/xml');
    res.send(twiml);
}));
app.listen(3000, () => console.log('Server is running on port 3000'));
function sendWhatsAppMessage(to, message) {
    return __awaiter(this, void 0, void 0, function* () {
        yield client.messages.create({
            body: message,
            from: `whatsapp:${process.env.TWILIO_NUMBER}`,
            to: `whatsapp:+5521975707562`
        });
    });
}
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
            case 'INIT':
                // Salva o nome e número de telefone do participante a partir do WhatsApp
                //userState.data.name = getUserNameFromWhatsApp(senderNumber);
                userState.data.phoneNumber = senderNumber;
                yield handleStateUpdate(message, senderNumber, userState, 'NEXTState:Role', 'Você é: \n 1. Participante \n 2. Primeiro de cordada?');
                break;
            case 'NEXTState:Role':
                if (message === '1') {
                    userState.data.role = 'Participante';
                    yield handleStateUpdate(message, senderNumber, userState, 'ROLE', 'Você é: \n 1. Participante \n 2. Primeiro de cordada?');
                }
                else if (message === '2') {
                    userState.data.role = 'Primeiro de cordada';
                    yield handleStateUpdate(message, senderNumber, userState, 'ROLE', 'Você é: \n 1. Participante \n 2. Primeiro de cordada?');
                }
                else {
                    sendWhatsAppMessage(senderNumber, 'Por favor, digite 1 ou 2');
                }
                yield handleStateUpdate(message, senderNumber, userState, 'ChooseDays', 'Quais dias da semana você prefere?');
                break;
            case 'ChooseDays':
                yield handleStateUpdate(message, senderNumber, userState, 'TIME', 'Qual horário você prefere?');
                break;
            case 'TIME':
                yield handleTime(message, senderNumber, userState);
                break;
        }
    });
}
function handleStateUpdate(message, senderNumber, userState, nextState, nextMessage) {
    return __awaiter(this, void 0, void 0, function* () {
        userState.data[userState.state.toLowerCase()] = message.split(' ');
        userState.state = nextState;
        userStates[senderNumber] = userState;
        sendWhatsAppMessage(senderNumber, nextMessage);
    });
}
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
            row[day] = userState.data.days.includes(day) ? userState.data.time.join(' ') : 'Manhã e Tarde (dia todo)';
        });
        yield sheet.addRow(row);
        delete userStates[senderNumber];
        function getAvailablePrimeirosDeCordada(days, time, role) {
            return __awaiter(this, void 0, void 0, function* () {
                const sheet = doc.sheetsByIndex[0];
                yield sheet.loadCells('A:J'); // Load todas as células até coluna J
                const rows = yield sheet.getRows();
                const availableUsers = rows.filter((row) => {
                    if (row['Tipo Participante'] !== role) { // considerar apenas usuários com função diferente do atual
                        let availabilityMatches = false;
                        let availableTimes = [];
                        days.forEach(day => {
                            if (time.includes(row[day])) { // Verifica se o horário do usuário contém o horário da planilha
                                availabilityMatches = true;
                                availableTimes.push(day + ": " + row[day]);
                            }
                        });
                        if (availabilityMatches) {
                            row.availableTimes = availableTimes; // adiciona os horários disponíveis ao objeto da linha para uso posterior
                        }
                        return availabilityMatches;
                    }
                });
                return availableUsers;
            });
        }
        const availableUsers = yield getAvailablePrimeirosDeCordada(userState.data.days, userState.data.time, userState.data.role);
        if (userState.data.role === 'Participante') {
            let message = `Existem ${availableUsers.length} Primeiros de Cordada disponíveis no mesmo horário que você.`;
            availableUsers.forEach(user => {
                message += `\nNome: ${user.Nome}, Horários: ${user.availableTimes.join(", ")}`;
            });
            sendWhatsAppMessage(senderNumber, message);
        }
        else if (userState.data.role === 'Primeiro de cordada') {
            let message = `Existem ${availableUsers.length} Participantes disponíveis no mesmo horário que você.`;
            availableUsers.forEach(user => {
                message += `\nNome: ${user.Nome}, Horários: ${user.availableTimes.join(", ")}`;
            });
            sendWhatsAppMessage(senderNumber, message);
        }
    });
}
