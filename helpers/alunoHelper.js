import 'dotenv/config';
import supertest from 'supertest';

const request = supertest(process.env.BASE_URL);

export async function loginAluno(email, senha) {
    const resposta = await request
        .post('/api/auth/login')
        .send({ email, senha });
    return { token: resposta.body.token, usuario: resposta.body.usuario };
}