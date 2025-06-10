// backend/server.js

require('dotenv').config(); // Carrega as variáveis de ambiente do arquivo .env

const express = require('express');
const mysql = require('mysql2/promise'); // Usamos a versão promise para async/await
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // Porta do nosso servidor backend

// Middlewares
app.use(cors()); // Habilita o CORS para permitir requisições do frontend
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// Configuração da conexão com o banco de dados MySQL
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306 // Porta padrão do MySQL
};

// Teste de conexão com o banco de dados
async function testDbConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Conexão com o banco de dados MySQL estabelecida com sucesso!');
        await connection.end(); // Fecha a conexão de teste
    } catch (error) {
        console.error('Erro ao conectar ao banco de dados MySQL:', error.message);
        process.exit(1); // Sai do processo se não conseguir conectar ao DB
    }
}

// Chame a função de teste de conexão antes de iniciar o servidor
testDbConnection();

// Defina sua primeira rota de exemplo
app.get('/', (req, res) => {
    res.send('API do sistema de consulta MySQL está online!');
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
});


app.get('/consulta-pedidos', async (req, res) => {
    const { cliente, data } = req.query;

    let query = 'SELECT * FROM pedidos WHERE 1=1';
    const params = [];

    if (cliente) {
        query += ' AND Nome_Cliente LIKE ?';
        params.push(`%${cliente}%`); // busca parcial
    }

    if (data) {
        query += ' AND Data_Emissao = ?';
        params.push(data);
    }

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(query, params);
        await connection.end();

        res.json(rows);
    } catch (error) {
        console.error('Erro ao consultar pedidos:', error.message);
        res.status(500).json({ error: 'Erro ao consultar os pedidos' });
    }
});

app.get('/consulta-generica', async (req, res) => {
    const { tabela, coluna, valor } = req.query;

    if (!tabela || !coluna || !valor) {
        return res.status(400).json({ error: 'tabela, coluna e valor são obrigatórios' });
    }

    // Evita SQL injection (validação básica)
    const nomeTabela = tabela.replace(/[^a-zA-Z0-9_]/g, '');
    const nomeColuna = coluna.replace(/[^a-zA-Z0-9_]/g, '');

    const query = `SELECT * FROM \`${nomeTabela}\` WHERE \`${nomeColuna}\` LIKE ?`;

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(query, [`%${valor}%`]);
        await connection.end();

        res.json(rows);
    } catch (error) {
        console.error('Erro na consulta genérica:', error.message);
        res.status(500).json({ error: 'Erro ao consultar o banco de dados' });
    }
});
