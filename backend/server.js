// backend/server.js
require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro na aplicação:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Ocorreu um erro ao processar sua requisição. Por favor, tente novamente.'
    });
});

// Configuração do banco de dados
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: process.env.DB_PORT || 3306
};

// Função para testar conexão com o banco
const testDatabaseConnection = async () => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Conexão com o banco de dados estabelecida com sucesso!');
        console.log('Configuração:', {
            host: dbConfig.host,
            user: dbConfig.user,
            database: dbConfig.database,
            port: dbConfig.port
        });
        await connection.end();
    } catch (error) {
        console.error('Erro ao conectar com o banco de dados:', error);
        process.exit(1);
    }
};

// Rota inicial
app.get('/', (req, res) => {
    res.json({ message: 'Sistema de consulta está online!' });
});

// Rota de diagnóstico
app.get('/diagnostico', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Verificar contagem de registros em cada tabela
        const [clientesCount] = await connection.execute('SELECT COUNT(*) as count FROM clientes');
        const [pedidosCount] = await connection.execute('SELECT COUNT(*) as count FROM pedidos');
        const [movimentosCount] = await connection.execute('SELECT COUNT(*) as count FROM movimentos_financeiros');
        const [produtosCount] = await connection.execute('SELECT COUNT(*) as count FROM produtos_vendidos');
        
        // Pegar uma amostra de clientes
        const [clientesSample] = await connection.execute('SELECT * FROM clientes LIMIT 5');
        
        await connection.end();
        
        res.json({
            tabelas: {
                clientes: clientesCount[0].count,
                pedidos: pedidosCount[0].count,
                movimentos_financeiros: movimentosCount[0].count,
                produtos_vendidos: produtosCount[0].count
            },
            amostra_clientes: clientesSample
        });
    } catch (error) {
        console.error('Erro no diagnóstico:', error);
        res.status(500).json({ 
            error: 'Erro ao realizar diagnóstico',
            details: error.message
        });
    }
});

// Rota para testar conexão e criar tabelas se necessário
app.get('/setup-database', async (req, res) => {
    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Limpar tabelas existentes
        console.log('Removendo tabelas existentes...');
        await connection.execute('DROP TABLE IF EXISTS produtos_vendidos');
        await connection.execute('DROP TABLE IF EXISTS movimentos_financeiros');
        await connection.execute('DROP TABLE IF EXISTS pedidos');
        await connection.execute('DROP TABLE IF EXISTS clientes');
        
        console.log('Criando tabela clientes...');
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS clientes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                Nome VARCHAR(100),
                Nome_Fantasia VARCHAR(100),
                Endereco VARCHAR(200),
                Bairro VARCHAR(100),
                Cidade VARCHAR(100),
                Cep VARCHAR(10),
                Cnpj VARCHAR(20),
                Inscrisao VARCHAR(20),
                Primeira_Compra DATE,
                Ultima_Compra DATE,
                Data_Cadastro DATE,
                Telefone VARCHAR(20),
                Email VARCHAR(100),
                Comentarios TEXT,
                Contato1 VARCHAR(100),
                Celular VARCHAR(20)
            )
        `);

        // Criar tabela de movimentos financeiros
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS movimentos_financeiros (
                id INT AUTO_INCREMENT PRIMARY KEY,
                Nome_Cliente VARCHAR(100),
                Cnpj VARCHAR(20),
                data_movimento DATE,
                tipo_movimento ENUM('entrada', 'saida'),
                valor DECIMAL(10, 2),
                descricao TEXT,
                forma_pagamento VARCHAR(50),
                status ENUM('pago', 'pendente', 'cancelado')
            )
        `);

        // Criar tabela de pedidos
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS pedidos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                Pedido_Id VARCHAR(50),
                Nome_Cliente VARCHAR(100),
                Cnpj VARCHAR(20),
                Data_Emissao DATE,
                Condicao_Pagto VARCHAR(50),
                Valor_Total DECIMAL(10, 2),
                Valor_Produto DECIMAL(10, 2),
                Qtd_Itens INT,
                Cidade VARCHAR(100),
                Filial_Id VARCHAR(20),
                Status_Pedido ENUM('em andamento', 'concluido', 'cancelado'),
                Data_Faturamento DATE,
                Data_Cancelamento DATE,
                Observacoes TEXT
            )
        `);

        // Criar tabela de produtos vendidos
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS produtos_vendidos (
                id INT AUTO_INCREMENT PRIMARY KEY,
                produto_codigo VARCHAR(50),
                produto_descricao VARCHAR(255),
                quantidade INT,
                pedido VARCHAR(50)
            )
        `);        // Inserir dados de exemplo na tabela clientes
        console.log('Inserindo dados de exemplo em clientes...');
        await connection.execute(`
            INSERT INTO clientes (
                Nome, Nome_Fantasia, Endereco, Bairro, Cidade, 
                Cep, Cnpj, Inscrisao, Data_Cadastro, Telefone, 
                Email, Comentarios, Contato1, Celular
            ) VALUES 
            ('CARDIM & ALBUQUERQUE CONSTRUCOES LTDA', 'CARDIM CONSTRUÇÕES', 
            'Rua Exemplo, 123', 'Centro', 'São Paulo', 
            '01234-567', '12.345.678/0001-90', '123456789', 
            CURDATE(), '(11) 1234-5678',
            'contato@cardim.com.br', 'Cliente desde 2020', 'João Silva', '(11) 98765-4321'),
            
            ('CONSUMIDOR DA LOJA', 'CONSUMIDOR', 
            'Rua Teste, 456', 'Jardim', 'São Paulo', 
            '04567-890', '98.765.432/0001-21', '987654321', 
            CURDATE(), '(11) 9876-5432',
            'consumidor@email.com', NULL, 'Maria Santos', '(11) 98888-7777'),
            
            ('LOJAS SILVA LTDA', 'LOJAS SILVA', 
            'Av Principal, 789', 'Centro', 'São Paulo', 
            '04567-123', '11.222.333/0001-44', '444555666', 
            CURDATE(), '(11) 3333-4444',
            'contato@silva.com.br', 'Cliente VIP', 'Carlos Silva', '(11) 97777-8888')
        `);

        // Inserir dados de exemplo na tabela pedidos se estiver vazia
        const [pedidosCount] = await connection.execute('SELECT COUNT(*) as count FROM pedidos');
        if (pedidosCount[0].count === 0) {
            await connection.execute(`
                INSERT INTO pedidos (
                    Pedido_Id,
                    Nome_Cliente,
                    Data_Emissao,
                    Cidade,
                    Filial_Id,
                    Qtd_Itens,
                    Valor_Produto,
                    Valor_Total,
                    Status_Pedido
                ) VALUES 
                ('PED001', 
                'CARDIM & ALBUQUERQUE CONSTRUCOES LTDA',
                CURDATE(),
                'São Paulo',
                'SP01',
                5,
                1500.00,
                1650.00,
                'em andamento'),
                ('PED002',
                'CARDIM & ALBUQUERQUE CONSTRUCOES LTDA',
                DATE_SUB(CURDATE(), INTERVAL 5 DAY),
                'São Paulo',
                'SP02',
                3,
                2200.00,
                2420.00,
                'concluido'),
                ('PED003',
                'CONSUMIDOR DA LOJA',
                DATE_SUB(CURDATE(), INTERVAL 10 DAY),
                'São Paulo',
                'SP01',
                2,
                800.00,
                880.00,
                'concluido')
            `);
        }

        await connection.end();
        res.json({ message: 'Banco de dados configurado com sucesso!' });
    } catch (error) {
        console.error('Erro ao configurar banco de dados:', error);
        res.status(500).json({ 
            error: 'Erro ao configurar banco de dados', 
            details: error.message 
        });
    }
});

// Rota para buscar sugestões de clientes
app.get('/sugestao-clientes', async (req, res) => {
    const { termo } = req.query;
    if (!termo) return res.json([]);

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [clientes] = await connection.execute(
            `SELECT DISTINCT Nome, Nome_Fantasia, Cnpj 
             FROM clientes 
             WHERE Nome LIKE ? OR Nome_Fantasia LIKE ? OR Cnpj LIKE ? 
             LIMIT 10`,
            [`%${termo}%`, `%${termo}%`, `%${termo}%`]
        );
        await connection.end();
        res.json(clientes);
    } catch (error) {
        console.error('Erro ao buscar sugestões:', error);
        res.status(500).json({ 
            error: 'Erro ao buscar sugestões',
            message: 'Não foi possível buscar as sugestões de clientes. Por favor, tente novamente.' 
        });
    }
});

// Rota para consultar cliente
app.get('/consulta-cliente', async (req, res) => {
    const { cliente } = req.query;
    if (!cliente) return res.status(400).json({ error: 'Cliente não informado' });

    try {
        const connection = await mysql.createConnection(dbConfig);

        let clientes, pedidos;
        // Regex para CNPJ com ou sem máscara
        if (/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$|^\d{14}$/.test(cliente)) {
            // Busca exata por CNPJ, removendo pontuação
            const cnpjLimpo = cliente.replace(/\D/g, '');
            [clientes] = await connection.execute(
                `SELECT DISTINCT 
                    Nome, Nome_Fantasia, Endereco, Bairro, Cidade, 
                    Cep, Cnpj, Data_Cadastro, Telefone,
                    Email, Comentarios, Contato1, Celular
                 FROM clientes
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(Cnpj, '.', ''), '-', ''), '/', ''), ' ', '') = ?`,
                [cnpjLimpo]
            );
            [pedidos] = await connection.execute(
                `SELECT 
                    Data_Emissao,
                    Valor_Total,
                    Nome_Cliente,
                    Qtd_Itens,
                    Cidade,
                    Pedido_Id,
                    Filial_Id
                 FROM pedidos
                 WHERE REPLACE(REPLACE(REPLACE(REPLACE(Cnpj, '.', ''), '-', ''), '/', ''), ' ', '') = ? 
                 ORDER BY Data_Emissao DESC`,
                [cnpjLimpo]
            );
        } else {
            // Busca por nome
            [clientes] = await connection.execute(
                `SELECT DISTINCT 
                    Nome, Nome_Fantasia, Endereco, Bairro, Cidade, 
                    Cep, Cnpj, Data_Cadastro, Telefone,
                    Email, Comentarios, Contato1, Celular
                 FROM clientes
                 WHERE Nome LIKE ? OR Nome_Fantasia LIKE ? OR Cnpj LIKE ?`,
                [`%${cliente}%`, `%${cliente}%`, `%${cliente}%`]
            );
            [pedidos] = await connection.execute(
                `SELECT 
                    Data_Emissao,
                    Valor_Total,
                    Nome_Cliente,
                    Qtd_Itens,
                    Cidade,
                    Pedido_Id,
                    Filial_Id
                 FROM pedidos
                 WHERE Nome_Cliente LIKE ? OR Cnpj LIKE ?
                 ORDER BY Data_Emissao DESC`,
                [`%${cliente}%`, `%${cliente}%`]
            );
        }

        await connection.end();

        res.json({
            cliente: clientes[0] || null,
            pedidos: pedidos || []
        });
    } catch (error) {
        console.error('Erro ao consultar cliente:', error);
        res.status(500).json({ 
            error: 'Erro ao consultar cliente',
            details: error.message 
        });
    }
});

// Rota para buscar histórico financeiro
app.get('/historico-financeiro', async (req, res) => {
    const { cliente } = req.query;
    if (!cliente) return res.status(400).json({ error: 'Cliente não informado' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        const [movimentos] = await connection.execute(
            `SELECT 
                data_movimento,
                tipo_movimento,
                valor,
                descricao,
                forma_pagamento,
                status
             FROM movimentos_financeiros
             WHERE Nome_Cliente LIKE ? OR Cnpj LIKE ?
             ORDER BY data_movimento DESC`,
            [`%${cliente}%`, `%${cliente}%`]
        );

        await connection.end();

        // Calcular totais
        const totais = movimentos.reduce((acc, mov) => {
            const valor = Number(mov.valor || 0);
            if (mov.tipo_movimento === 'entrada') {
                acc.totalEntradas += valor;
            } else {
                acc.totalSaidas += valor;
            }
            return acc;
        }, { totalEntradas: 0, totalSaidas: 0 });

        res.json({
            movimentos,
            totais: {
                ...totais,
                saldoTotal: totais.totalEntradas - totais.totalSaidas
            }
        });
    } catch (error) {
        console.error('Erro ao consultar histórico financeiro:', error);
        res.status(500).json({
            error: 'Erro ao consultar histórico financeiro',
            details: error.message
        });
    }
});

// Rota para buscar histórico completo de pedidos
app.get('/historico-pedidos', async (req, res) => {
    const { cliente } = req.query;
    if (!cliente) return res.status(400).json({ error: 'Cliente não informado' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            `SELECT 
                p.Numero_Pedido,
                p.Data_Emissao,
                p.Condicao_Pagto,
                p.Valor_Total,
                p.Valor_Liquido,
                p.Status_Pedido,
                p.Data_Faturamento,
                p.Data_Cancelamento,
                p.Observacoes
            FROM pedidos p
            WHERE p.Nome_Cliente LIKE ? OR p.Cnpj LIKE ?
            ORDER BY p.Data_Emissao DESC`,
            [`%${cliente}%`, `%${cliente}%`]
        );
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar histórico de pedidos:', error);
        res.status(500).json({ error: 'Erro ao buscar histórico de pedidos' });
    }
});

// Rota para buscar produtos do cliente
app.get('/produtos-cliente', async (req, res) => {
    const { cliente } = req.query;
    if (!cliente) return res.status(400).json({ error: 'Cliente não informado' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.execute(
            `SELECT 
                p.produto_codigo,
                p.produto_descricao,
                COUNT(DISTINCT pe.Pedido_Id) as total_pedidos,
                SUM(p.quantidade) as quantidade_total,
                MAX(pe.Data_Emissao) as ultima_compra,
                MIN(pe.Data_Emissao) as primeira_compra
            FROM produtos_vendidos p
            JOIN pedidos pe ON p.pedido = pe.Pedido_Id
            WHERE pe.Nome_Cliente LIKE ? OR pe.Cnpj LIKE ?
            GROUP BY p.produto_codigo, p.produto_descricao
            ORDER BY total_pedidos DESC`,
            [`%${cliente}%`, `%${cliente}%`]
        );
        await connection.end();
        res.json(rows);
    } catch (error) {
        console.error('Erro ao buscar produtos do cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar produtos do cliente' });
    }
});

// Rota para buscar itens de um pedido (usando itensped)
app.get('/itens-pedido', async (req, res) => {
    const { pedidoId } = req.query;
    if (!pedidoId) return res.status(400).json({ error: 'Pedido não informado' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        // Busca itens do pedido na tabela itensped
        const [itens] = await connection.execute(
            `SELECT 
                Recnum,
                Produto,
                Descricao_Produto,
                Unidade_Produto,
                Qtd,
                Unitario,
                Valor_Total,
                Valor_Liquido
            FROM itensped
            WHERE Pedido_Id = ?`,
            [pedidoId]
        );
        await connection.end();
        res.json(itens);
    } catch (error) {
        console.error('Erro ao buscar itens do pedido:', error);
        res.status(500).json({ error: 'Erro ao buscar itens do pedido' });
    }
});

// Middleware para tratamento de erros
app.use((err, req, res, next) => {
    console.error('Erro na aplicação:', err);
    res.status(500).json({
        error: 'Erro interno do servidor',
        message: err.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

// Middleware para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({
        error: 'Rota não encontrada',
        path: req.path
    });
});

// Iniciar o servidor
app.listen(PORT, async () => {
    console.log(`Servidor backend rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
    
    // Testar conexão com o banco ao iniciar
    await testDatabaseConnection();
});
