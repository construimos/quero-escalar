import express from 'express';
import { config } from 'dotenv';
import { sendWhatsAppMessage, processMessage } from './services/chat';

config();

const app = express();
app.use(express.json());

app.post('/message', async (req, res) => {
    const { Body: message, From: senderNumber } = req.body;

    try {
        await processMessage(message, senderNumber);
        res.sendStatus(200);
    } catch (error) {
        console.error(`Error processing message: ${error}`);
        await sendWhatsAppMessage(senderNumber, 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
        res.sendStatus(500);
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
