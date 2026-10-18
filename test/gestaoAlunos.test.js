import 'dotenv/config';
import supertest from 'supertest';
import { expect } from 'chai';
import { loginAdmin } from '../helpers/adminHelper.js';
import { loginAluno } from '../helpers/alunoHelper.js';
import { readFileSync } from 'fs';

const timestamp = Date.now();
const alunos = JSON.parse(readFileSync('./data/alunos.json', 'utf-8')).map(a => ({
    ...a,
    email: `${timestamp}.${a.email}`,
    matricula: `${timestamp}${a.matricula}`
}));
const trabalhos = JSON.parse(readFileSync('./data/trabalhos.json', 'utf-8'));
const request = supertest(process.env.BASE_URL);
describe('Gestão de Alunos API', () => {
    let tokenAdmin;
    let tokenAluno;
    let alunoId;
    let disciplinaId;

    before(async () => {
        tokenAdmin = await loginAdmin();
    });

    describe('Login de administrador', () => {
        it('Deve logar como administrador com sucesso', async () => {
            const resposta = await request
                .post('/api/auth/login')
                .send({ email: process.env.ADMIN_EMAIL, senha: process.env.ADMIN_SENHA });
            expect(resposta.status).to.equal(200);
            expect(resposta.body).to.have.property('token');
            expect(resposta.body).to.have.property('usuario');
            expect(resposta.body.usuario.role).to.equal('admin');
        });
    });

    describe('Cadastro de aluno (Data-Driven Testing)', () => {
        alunos.forEach((aluno) => {
            it(`Deve cadastrar o aluno ${aluno.nome} com sucesso`, async () => {
                const resposta = await request
                    .post('/api/admin/alunos')
                    .set('Authorization', `Bearer ${tokenAdmin}`)
                    .send(aluno);
                expect(resposta.status).to.equal(201);
                expect(resposta.body).to.have.property('id');
                expect(resposta.body.nome).to.equal(aluno.nome);
                expect(resposta.body.email).to.equal(aluno.email);
                expect(resposta.body.matricula).to.equal(aluno.matricula);
                if (!alunoId) { alunoId = resposta.body.id; }
            });
        });
    });

    describe('Login de aluno e entrega de trabalho (Data-Driven Testing)', () => {
        before(async () => {
            const primeiroAluno = alunos[0];
            const loginResposta = await loginAluno(primeiroAluno.email, primeiroAluno.senha);
            tokenAluno = loginResposta.token;
            alunoId = loginResposta.usuario.id;
            const disciplinaResposta = await request
                .post('/api/admin/disciplinas')
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ nome: 'Automação de Testes', codigo: 'AT001' });
            disciplinaId = disciplinaResposta.body._id || disciplinaResposta.body.id;
            await request
                .post(`/api/admin/disciplinas/${disciplinaId}/matriculas`)
                .set('Authorization', `Bearer ${tokenAdmin}`)
                .send({ alunoId });
        });

        it('Deve logar como aluno com sucesso', async () => {
            const primeiroAluno = alunos[0];
            const resposta = await request
                .post('/api/auth/login')
                .send({ email: primeiroAluno.email, senha: primeiroAluno.senha });
            expect(resposta.status).to.equal(200);
            expect(resposta.body).to.have.property('token');
            expect(resposta.body.usuario.role).to.equal('aluno');
        });

        trabalhos.forEach((trabalho) => {
            it(`Deve registrar o trabalho "${trabalho.titulo}" como aluno`, async () => {
                const resposta = await request
                    .post(`/api/alunos/${alunoId}/trabalhos`)
                    .set('Authorization', `Bearer ${tokenAluno}`)
                    .send({ disciplinaId, titulo: trabalho.titulo, descricao: trabalho.descricao });
                expect(resposta.status).to.equal(201);
                expect(resposta.body).to.have.property('id');
                expect(resposta.body.titulo).to.equal(trabalho.titulo);
                expect(resposta.body.status).to.equal('entregue');
            });
        });
    });
});