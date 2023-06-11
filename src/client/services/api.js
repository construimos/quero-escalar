import axios from 'axios';
import { User } from '../../shared/models/User.js';

const api = axios.create({
	baseURL: '/api/'
});

export const apiService = {
	session: {
		async getUser() {
			let { data } = await api.get('/session/user');

			return data ? new User(data) : null;
		}
	}
};
