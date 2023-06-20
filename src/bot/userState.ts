type UserStateType = 'NAME' | 'ROLE' | 'DAYS' | 'TIME' | 'CONFIRM' | 'COMPLETED';

const states: { [key in UserStateType]: UserStateType } = {
    'NAME': 'ROLE',
    'ROLE': 'DAYS',
    'DAYS': 'TIME',
    'TIME': 'CONFIRM',
    'CONFIRM': 'COMPLETED',
    'COMPLETED': 'COMPLETED'
};

const messages: { [key in UserStateType]: string | ((data: any) => string) } = {
    'NAME': 'Você é: \n 1. Participante \n 2. Primeiro de cordada?',
    'ROLE': 'Quais dias da semana você prefere? (separe por vírgulas)',
    'DAYS': 'Qual horário você prefere? (Manhã, Tarde, Dia Todo)',
    'TIME': (data: any) => 'Confirme os detalhes: \n' + JSON.stringify(data, null, 2),
    'CONFIRM': 'Seus detalhes foram salvos. Obrigado!',
    'COMPLETED': 'Seus detalhes já foram salvos.'
};

interface UserState {
    state: UserStateType;
    data: any;
    getNextMessage: () => Promise<string | void>;
}

async function processUserState(userState: UserState, message: string): Promise<UserState> {
    switch (userState.state) {
        case 'NAME':
            userState.data.name = message;
            break;
        case 'ROLE':
            if (message !== '1' && message !== '2') {
                throw new Error('Input inválido. Por favor, digite 1 para Participante ou 2 para Primeiro de cordada');
            }
            userState.data.role = message === '1' ? 'Participante' : 'Primeiro de cordada';
            break;
        case 'DAYS':
            userState.data.days = message.split(',').map(day => day.trim());
            break;
        case 'TIME':
            userState.data.time = message.split(',').map(time => time.trim());
            break;
        case 'CONFIRM':
            // Lógica para salvar os dados do usuário vai aqui
            // Por exemplo, TODO criar uma função saveUserDetails(userState.data) para salvar os dados no banco de dados
            break;
    }

    userState.state = states[userState.state];
    userState.getNextMessage = async () => {
        return typeof messages[userState.state] === 'function' ? (messages[userState.state] as Function)(userState.data) : messages[userState.state];
    }

    return userState;
}

export { UserState, UserStateType, processUserState };