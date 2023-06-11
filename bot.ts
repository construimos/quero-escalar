import express, { Request, Response } from 'express';
import twilio from 'twilio';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import cron from 'node-cron';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID!);
const userStates: { [key: string]: any } = {};
const DAYS = ['Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado', 'Domingo'];
// variavel data que vai ser usada para armazenar os valores a serem preenchidos na planilha
const dataPlanilha = {
  name: '',
  phoneNumber: '',
  role: '',
  days: [],
  time: []
};

async function accessSpreadsheet() {
  await doc.useServiceAccountAuth({
    client_email: process.env.GOOGLE_CLIENT_EMAIL!,
    private_key: process.env.GOOGLE_PRIVATE_KEY!
  });

  await doc.loadInfo();
}

async function updateSubheader() {
  // Atualiza o subheader da planilha com as datas da próxima semana
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

accessSpreadsheet();

cron.schedule('* * * * *', function () {
  // Envia uma mensagem para o grupo todo domingo às 16:20
  sendWhatsAppMessage('group_id', `Quer escalar esta semana? Clique aqui: https://api.whatsapp.com/send?phone=${process.env.TWILIO_NUMBER}&text=Oi`);
  updateSubheader();
});

app.post('/webhook', async (req: Request, res: Response) => {
  const message = req.body.Body;
  const senderNumber = req.body.From;
  await processMessage(message, senderNumber);

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
});

app.listen(3000, () => console.log('Server is running on port 3000'));

async function sendWhatsAppMessage(to: string, message: string) {
  await client.messages.create({
    body: message,
    from: `whatsapp:${process.env.TWILIO_NUMBER}`,
    to: `whatsapp:+5521975707562`
  });
}

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
    case 'INIT':
      // Salva o nome e número de telefone do participante a partir do WhatsApp
      //userState.data.name = getUserNameFromWhatsApp(senderNumber);
      userState.data.phoneNumber = senderNumber;
      await handleStateUpdate(message, senderNumber, userState, 'NEXTState:Role', 'Você é: \n 1. Participante \n 2. Primeiro de cordada?');
      break;


    case 'NEXTState:Role':
      if (message === '1') {
        userState.data.role = 'Participante';
        await handleStateUpdate(message, senderNumber, userState, 'ROLE', 'Você é: \n 1. Participante \n 2. Primeiro de cordada?');
      } else if (message === '2') {
        userState.data.role = 'Primeiro de cordada';
        await handleStateUpdate(message, senderNumber, userState, 'ROLE', 'Você é: \n 1. Participante \n 2. Primeiro de cordada?');
      } else {
        sendWhatsAppMessage(senderNumber, 'Por favor, digite 1 ou 2');
      }
      await handleStateUpdate(message, senderNumber, userState, 'ChooseDays', 'Quais dias da semana você prefere?');
      break;

    case 'ChooseDays':
      await handleStateUpdate(message, senderNumber, userState, 'TIME', 'Qual horário você prefere?');
      break;

    case 'TIME':
      await handleTime(message, senderNumber, userState);
      break;
  }
}

async function handleStateUpdate(message: string, senderNumber: string, userState: any, nextState: string, nextMessage: string) {
  userState.data[userState.state.toLowerCase()] = message.split(' ');
  userState.state = nextState;
  userStates[senderNumber] = userState;

  sendWhatsAppMessage(senderNumber, nextMessage);
}

async function handleTime(message: string, senderNumber: string, userState: any) {
  userState.data.time = message.split(' ');

  const sheet = doc.sheetsByIndex[0];
  const row: { [key: string]: any } = {
    Nome: userState.data.name,
    Telefone: userState.data.phoneNumber,
    'Tipo Participante': userState.data.role
  };

  DAYS.forEach(day => {
    row[day] = userState.data.days.includes(day) ? userState.data.time.join(' ') : 'Manhã e Tarde (dia todo)';
  });

  await sheet.addRow(row);

  delete userStates[senderNumber];



  async function getAvailablePrimeirosDeCordada(days: string[], time: string[], role: string) {
    const sheet = doc.sheetsByIndex[0];
    await sheet.loadCells('A:J'); // Load todas as células até coluna J
    const rows = await sheet.getRows();

    const availableUsers = rows.filter((row) => {
      if (row['Tipo Participante'] !== role) { // considerar apenas usuários com função diferente do atual
        let availabilityMatches = false;
        let availableTimes: string[] = [];
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
  }

  const availableUsers = await getAvailablePrimeirosDeCordada(userState.data.days, userState.data.time, userState.data.role);

  if (userState.data.role === 'Participante') {
    let message = `Existem ${availableUsers.length} Primeiros de Cordada disponíveis no mesmo horário que você.`;
    availableUsers.forEach(user => {
      message += `\nNome: ${user.Nome}, Horários: ${user.availableTimes.join(", ")}`;
    });
    sendWhatsAppMessage(senderNumber, message);
  } else if (userState.data.role === 'Primeiro de cordada') {
    let message = `Existem ${availableUsers.length} Participantes disponíveis no mesmo horário que você.`;
    availableUsers.forEach(user => {
      message += `\nNome: ${user.Nome}, Horários: ${user.availableTimes.join(", ")}`;
    });
    sendWhatsAppMessage(senderNumber, message);
  }

}

