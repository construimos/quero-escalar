import { appendRowToSheet } from './googleSheetService';
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);

const userStates: { [key: string]: any } = {};

type UserState = 'NAME' | 'ROLE' | 'DAYS' | 'TIME' | 'CONFIRM' | 'COMPLETED';

const states: { [key in UserState]: UserState } = {
    'NAME': 'ROLE',
    'ROLE': 'DAYS',
    'DAYS': 'TIME',
    'TIME': 'CONFIRM',
    'CONFIRM': 'COMPLETED',
    'COMPLETED': 'COMPLETED'
};

const messages: { [key in UserState]: string | ((data: any) => string) } = {
    'NAME': 'Você é: \n 1. Participante \n 2. Primeiro de cordada?',
    'ROLE': 'Quais dias da semana você prefere? (separe por vírgulas)',
    'DAYS': 'Qual horário você prefere? (Manhã, Tarde, Dia Todo)',
    'TIME': (data: any) => 'Confirme os detalhes: \n' + JSON.stringify(data, null, 2),
    'CONFIRM': 'Seus detalhes foram salvos. Obrigado!',
    'COMPLETED': 'Seus detalhes já foram salvos.'
};

async function sendWhatsAppMessage(to: string, message: string) {
    await client.messages.create({
        body: message,
        from: `whatsapp:${process.env.TWILIO_NUMBER}`,
        to: `whatsapp:${to}`
    });
}

async function processMessage(message: string, senderNumber: string) {
    let userState = userStates[senderNumber] || { state: 'NAME', data: {} };

    switch (userState.state) {
        case 'NAME':
            userState.data.name = message;
            break;
        case 'ROLE':
            userState.data.role = message === '1' ? 'Participante' : 'Primeiro de cordada';
            break;
        case 'DAYS':
            userState.data.days = message.split(',').map(day => day.trim());
            break;
        case 'TIME':
            userState.data.time = message.split(',').map(time => time.trim());
            break;
        case 'CONFIRM':
            if (message.toLowerCase() === 'sim') {
                await appendRowToSheet(Object.values(userState.data));
            } else {
                userState.state = 'NAME';
                userState.data = {};
                break;
            }
    }

    userState.state = states[userState.state as UserState];
    let nextMessage = typeof messages[userState.state as UserState] === 'function' ? (messages[userState.state as UserState] as Function)(userState.data) : messages[userState.state as UserState];
    await sendWhatsAppMessage(senderNumber, nextMessage);
    userStates[senderNumber] = userState;
}

export { sendWhatsAppMessage, processMessage };
