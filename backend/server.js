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
        `);

        // Criar tabela de itens do pedido
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS itensped (
                id INT AUTO_INCREMENT PRIMARY KEY,
                Pedido_Id VARCHAR(50),
                Numero INT,
                Produto VARCHAR(50),
                Descricao_Produto VARCHAR(255),
                Qtd INT,
                Unitario DECIMAL(10, 2),
                Valor_Total DECIMAL(10, 2),
                FOREIGN KEY (Pedido_Id) REFERENCES pedidos(Pedido_Id)
            )
        `);

        // Inserir dados de exemplo na tabela clientes
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

            // Inserir itens de exemplo
            await connection.execute(`
                INSERT INTO itensped (
                    Pedido_Id,
                    Numero,
                    Produto,
                    Descricao,
                    Qtd,
                    Unitario,
                    Valor_Total
                ) VALUES 
                ('PED001', 1, 'PROD001', 'Tênis Casual', 2, 300.00, 600.00),
                ('PED001', 2, 'PROD002', 'Sapato Social', 1, 450.00, 450.00),
                ('PED001', 3, 'PROD003', 'Sandália', 2, 300.00, 600.00),
                ('PED002', 1, 'PROD004', 'Bota', 1, 800.00, 800.00),
                ('PED002', 2, 'PROD005', 'Tênis Esportivo', 2, 700.00, 1400.00),
                ('PED003', 1, 'PROD006', 'Chinelo', 2, 400.00, 800.00)
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

// Rota para diagnóstico detalhado de itens do pedido
app.get('/diagnostico-itens-pedido', async (req, res) => {
    const { pedidoId } = req.query;
    if (!pedidoId) {
        return res.status(400).json({
            error: 'Pedido não informado',
            message: 'É necessário informar o ID do pedido'
        });
    }

    let connection;
    try {
        // 1. Conectar ao banco
        connection = await mysql.createConnection(dbConfig);
        console.log('Iniciando diagnóstico para pedido:', pedidoId);

        // 2. Buscar pedido
        const [pedidos] = await connection.execute(
            'SELECT * FROM pedidos WHERE Pedido_Id = ? OR Numero = ?',
            [pedidoId, pedidoId]
        );

        if (pedidos.length === 0) {
            await connection.end();
            return res.json({
                pedido: {
                    encontrado: false,
                    id_original: pedidoId,
                    id_formatado: pedidoId,
                    numero: null
                },
                itens: {
                    total: 0,
                    dados: []
                },
                pedidos_similares: [],
                status: {
                    pedido_encontrado: false,
                    tem_itens: false
                },
                sugestoes: ["Pedido não encontrado. Verifique se o número está correto."]
            });
        }

        const pedido = pedidos[0];

        // 3. Buscar itens do pedido
        console.log('Buscando itens com Pedido_Id:', pedido[0].Pedido_Id);
        const [itens] = await connection.execute(`
            SELECT 
                i.Numero as item_numero,
                i.Produto as produto_codigo,
                i.Descricao_Produto as descricao,
                i.Qtd as quantidade,
                i.Unitario as valor_unitario,
                i.Valor_Total as valor_total
            FROM itensped i
            WHERE i.Pedido_Id = ?
            ORDER BY i.Numero
        `, [pedido[0].Pedido_Id]);
        console.log('Itens encontrados:', itens.length);

        // Log específico para pedido 51616
        if (pedidoId === '51616') {
            console.log('\nDetalhes do Pedido 51616:');
            console.log('Status:', pedido[0].Status);
            console.log('Data Emissão:', pedido[0].Data_Emissao);
            console.log('Valor Total:', pedido[0].Valor_Total);
            console.log('\nItens do Pedido:');
            itens.forEach(item => {
                console.log(`\nItem ${item.Numero}:`);
                console.log('Código:', item.Produto);
                console.log('Descrição:', item.Descricao_Produto || item.Descricao);
                console.log('Referência:', item.Referencia);
                console.log('Cor:', item.Cor);
                console.log('Tamanho:', item.Tamanho);
                console.log('Quantidade:', item.Qtd);
                console.log('Unidade:', item.Unidade);
                console.log('Valor Unitário:', item.Unitario);
                console.log('Valor Total:', item.Valor_Total);
                console.log('Grupo:', item.Grupo);
                console.log('Subgrupo:', item.Subgrupo);
                console.log('Saldo:', item.Saldo);
            });
        }

        // 4. Buscar pedidos similares
        const [pedidosSimilares] = await connection.execute(
            `SELECT 
                p.Pedido_Id,
                p.Numero,
                p.Status,
                p.Data_Emissao,
                p.Valor_Total,
                p.Qtd_Itens,
                COUNT(i.Itensped_Id) as total_itens
            FROM pedidos p
            LEFT JOIN itensped i ON p.Pedido_Id = i.Pedido_Id
            WHERE p.Pedido_Id LIKE ? OR p.Numero LIKE ?
            GROUP BY p.Pedido_Id, p.Numero, p.Status, p.Data_Emissao, p.Valor_Total, p.Qtd_Itens
            HAVING total_itens > 0
            LIMIT 5`,
            [`%${pedidoId}%`, `%${pedidoId}%`]
        );

        // 5. Fechar conexão
        await connection.end();
        connection = null;

        // 6. Preparar dados formatados
        const formatarData = (data) => {
            if (!data) return null;
            try {
                return new Date(data).toLocaleDateString('pt-BR');
            } catch {
                return null;
            }
        };

        const formatarValor = (valor) => {
            if (valor === null || valor === undefined) return 0;
            return Number(valor).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        // 7. Preparar resposta
        const diagnostico = {
            pedido: {
                encontrado: true,
                dados: {
                    ...pedido,
                    Data_Emissao: formatarData(pedido.Data_Emissao),
                    Data_Cancel: formatarData(pedido.Data_Cancel),
                    Valor_Total: formatarValor(pedido.Valor_Total),
                    Valor_Liquido: formatarValor(pedido.Valor_Liquido),
                    Valor_Produtos: formatarValor(pedido.Valor_Produtos)
                },
                id_original: pedidoId,
                id_formatado: pedido.Pedido_Id,
                numero: pedido.Numero
            },
            itens: {
                total: itens.length,
                dados: itens.map(item => ({
                    id: item.Itensped_Id,
                    item_numero: item.Numero,
                    produto_codigo: item.Produto,
                    produto_descricao: item.Descricao_Produto || item.Descricao,
                    quantidade: item.Qtd,
                    valor_unitario: formatarValor(item.Unitario),
                    valor_total: formatarValor(item.Valor_Total),
                    valor_liquido: formatarValor(item.Valor_Liquido),
                    data_emissao: formatarData(item.Data_Emissao),
                    filial: item.Filial_Id,
                    referencia: item.Referencia,
                    cor: item.Cor,
                    tamanho: item.Tamanho,
                    unidade: item.Unidade,
                    grupo: item.Grupo,
                    subgrupo: item.Subgrupo,
                    saldo: formatarValor(item.Saldo)
                }))
            },
            pedidos_similares: pedidosSimilares.map(p => ({
                ...p,
                Data_Emissao: formatarData(p.Data_Emissao),
                Valor_Total: formatarValor(p.Valor_Total)
            })),
            status: {
                pedido_encontrado: true,
                tem_itens: itens.length > 0,
                foi_faturado: pedido.Nfemitida === 'S',
                nota_cancelada: pedido.Nfcancelada === 'S',
                pedido_cancelado: pedido.Status === 'E' || pedido.Status === 'C' || pedido.Data_Cancel,
                status_atual: pedido.Status,
                data_cancelamento: formatarData(pedido.Data_Cancel),
                data_emissao: formatarData(pedido.Data_Emissao)
            },
            sugestoes: []
        };

        // 8. Adicionar sugestões
        if (itens.length === 0) {
            diagnostico.sugestoes.push("Nenhum item encontrado para este pedido.");
        }
        if (pedido.Nfemitida === 'S') {
            diagnostico.sugestoes.push("O pedido já foi faturado. Verifique se os itens estão na nota fiscal.");
        }
        if (pedido.Nfcancelada === 'S') {
            diagnostico.sugestoes.push("A nota fiscal deste pedido foi cancelada.");
        }
        if (diagnostico.status.pedido_cancelado) {
            if (pedido.Data_Cancel) {
                diagnostico.sugestoes.push(`O pedido foi cancelado em ${formatarData(pedido.Data_Cancel)}.`);
            } else {
                diagnostico.sugestoes.push("O pedido está cancelado.");
            }
            if (pedido.Obs_Cancel && pedido.Obs_Cancel.trim()) {
                diagnostico.sugestoes.push(`Motivo do cancelamento: ${pedido.Obs_Cancel.trim()}`);
            }
        }
        if (pedidosSimilares.length > 0) {
            diagnostico.sugestoes.push("Existem pedidos similares que podem ser o correto.");
        }

        // 9. Enviar resposta
        res.json(diagnostico);

    } catch (error) {
        console.error('Erro no diagnóstico:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState
        });

        if (connection) {
            try {
                await connection.end();
            } catch (endError) {
                console.error('Erro ao fechar conexão:', endError);
            }
        }

        res.status(500).json({
            error: 'Erro no diagnóstico dos itens',
            message: error.message,
            diagnostico: {
                pedido: {
                    encontrado: false,
                    dados: null,
                    id_original: pedidoId,
                    id_formatado: pedidoId,
                    numero: null
                },
                itens: {
                    total: 0,
                    dados: []
                },
                pedidos_similares: [],
                status: {
                    pedido_encontrado: false,
                    tem_itens: false,
                    foi_faturado: false,
                    nota_cancelada: false,
                    pedido_cancelado: false
                },
                sugestoes: ["Ocorreu um erro ao buscar o diagnóstico do pedido. Por favor, tente novamente."]
            }
        });
    }
});

// Atualizar a rota de itens-pedido
app.get('/itens-pedido', async (req, res) => {
    const pedidoId = req.query.pedidoId;
    console.log('Buscando itens para pedido:', pedidoId);

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Conexão com o banco estabelecida');

        // Primeiro, vamos verificar se o pedido existe
        const [pedido] = await connection.execute(
            'SELECT Pedido_Id FROM pedidos WHERE Pedido_Id = ?',
            [pedidoId]
        );
        console.log('Pedido encontrado:', pedido);

        if (!pedido || pedido.length === 0) {
            console.log('Pedido não encontrado');
            return res.status(404).json({
                error: 'Pedido não encontrado',
                message: `Não foi encontrado nenhum pedido com o ID ${pedidoId}`
            });
        }

        // Agora vamos buscar os itens
        const [itens] = await connection.execute(`
            SELECT 
                i.Numero as item_numero,
                i.Produto as produto_codigo,
                i.Descricao_Produto as descricao,
                i.Qtd as quantidade,
                i.Unitario as valor_unitario,
                i.Valor_Total as valor_total
            FROM itensped i
            WHERE i.Pedido_Id = ?
            ORDER BY i.Numero
        `, [pedidoId]);

        console.log(`Encontrados ${itens.length} itens para o pedido ${pedidoId}`);
        console.log('Primeiro item (se houver):', itens[0]);

        // Formatar os valores
        const itensFormatados = itens.map(item => ({
            item_numero: item.item_numero,
            produto_codigo: item.produto_codigo,
            descricao: item.descricao || 'Produto sem descrição',
            quantidade: Number(item.quantidade) || 0,
            valor_unitario: Number(item.valor_unitario) || 0,
            valor_total: Number(item.valor_total) || 0,
            unidade: item.unidade || 'UN'
        }));

        res.json({ itens: itensFormatados });
    } catch (error) {
        console.error('Erro ao buscar itens do pedido:', {
            message: error.message,
            code: error.code,
            sqlMessage: error.sqlMessage,
            sqlState: error.sqlState,
            stack: error.stack
        });
        
        res.status(500).json({ 
            error: 'Erro ao buscar itens do pedido',
            message: error.message,
            details: error.sqlMessage
        });
    } finally {
        if (connection) {
            try {
                await connection.end();
            } catch (err) {
                console.error('Erro ao fechar conexão:', err);
            }
        }
    }
});

// Rota para buscar cheques do cliente
app.get('/cheques-cliente', async (req, res) => {
    const { cliente } = req.query;
    if (!cliente) return res.status(400).json({ error: 'Cliente não informado' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        // Corrigido: filtra apenas por Cliente, pois não existe coluna Cnpj na tabela cheques
        const [cheques] = await connection.execute(
            'SELECT * FROM cheques WHERE Cliente = ?',
            [cliente]
        );
        await connection.end();
        res.json(cheques);
    } catch (error) {
        console.error('Erro ao buscar cheques do cliente:', error);
        res.status(500).json({ error: 'Erro ao buscar cheques do cliente' });
    }
});

// Rota para diagnóstico de pedido específico
app.get('/diagnostico-pedido', async (req, res) => {
    const { pedidoId } = req.query;
    if (!pedidoId) return res.status(400).json({ error: 'Pedido não informado' });

    try {
        const connection = await mysql.createConnection(dbConfig);
        
        // Verificar pedido
        const [pedido] = await connection.execute(
            'SELECT * FROM pedidos WHERE Pedido_Id = ?',
            [pedidoId]
        );

        // Verificar produtos vendidos
        const [produtos] = await connection.execute(
            'SELECT * FROM produtos_vendidos WHERE pedido = ?',
            [pedidoId]
        );

        // Verificar se há diferença no formato do ID
        const [produtosAlternativos] = await connection.execute(
            'SELECT * FROM produtos_vendidos WHERE pedido LIKE ?',
            [`%${pedidoId}%`]
        );

        await connection.end();

        res.json({
            pedido: pedido[0] || null,
            produtos_encontrados: produtos,
            produtos_alternativos: produtosAlternativos,
            diagnostico: {
                pedido_existe: pedido.length > 0,
                produtos_encontrados: produtos.length,
                produtos_alternativos_encontrados: produtosAlternativos.length,
                formato_pedido_id: pedido[0]?.Pedido_Id,
                formato_produtos_pedido: produtos.map(p => p.pedido)
            }
        });
    } catch (error) {
        console.error('Erro no diagnóstico do pedido:', error);
        res.status(500).json({ 
            error: 'Erro no diagnóstico do pedido',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    testDatabaseConnection();
});
