import express from 'express';
import cron from 'node-cron';
import {processMessage, sendWhatsAppMessage} from "../services/messageService";
import {updateSubheader} from "../services/googleSheetService";
import bodyParser from 'body-parser';

const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.post('/whatsapp', (req: express.Request, res: express.Response) => {
    const message = req.body.Body;
    const senderNumber = req.body.From;

    if (message) {
        if (senderNumber) {
            processMessage(message, senderNumber).then(r => console.log(r));
        }
    }

    res.sendStatus(200);
});


app.listen(3000, () => console.log('Server is running on port 3000'));

cron.schedule('20 16 * * 0', function () {
    sendWhatsAppMessage('group_id', `Quer escalar esta semana? Clique aqui: https://api.whatsapp.com/send?phone=${process.env.TWILIO_NUMBER}&text=Oi`);
    updateSubheader();
});
