import 'dotenv/config';
import supertest from 'supertest';

const request = supertest(process.env.BASE_URL);

export async function loginAdmin() {
    const resposta = await request
        .post('/api/auth/login')
        .send({ email: process.env.ADMIN_EMAIL, senha: process.env.ADMIN_SENHA });
    return resposta.body.token;
}