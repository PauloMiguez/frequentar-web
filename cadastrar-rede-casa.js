const mysql = require('mysql2/promise');
require('dotenv').config();

async function cadastrarRedeCasa() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
        port: parseInt(process.env.DB_PORT) || 4000,
        user: process.env.DB_USER || '2q5LT5zV9doJdyc.root',
        password: process.env.DB_PASSWORD || 'kWglXVhB3uX5GzCO',
        database: process.env.DB_NAME || 'frequentar_db',
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    try {
        const ssid = 'ROCHA MIGUEZ';
        const bssid = '00:D7:6D:B3:CA:A4';
        
        // Verificar se já existe
        const [existe] = await pool.query(
            'SELECT id FROM access_points WHERE bssid = ? OR ssid = ?',
            [bssid, ssid]
        );
        
        if (existe.length > 0) {
            console.log('⚠️ Ponto de acesso já existe! Atualizando...');
            await pool.query(
                `UPDATE access_points 
                 SET ssid = ?, bssid = ?, sala = 'Casa - Escritório', predio = 'Casa', 
                     andar = '1', ip_range = '192.168.15.0/24', ativo = 1 
                 WHERE id = ?`,
                [ssid, bssid, existe[0].id]
            );
            console.log('✅ Ponto de acesso atualizado!');
        } else {
            // Inserir novo AP
            await pool.query(
                `INSERT INTO access_points (bssid, ssid, sala, predio, andar, ip_range, ativo) 
                 VALUES (?, ?, 'Casa - Escritório', 'Casa', '1', '192.168.15.0/24', 1)`,
                [bssid, ssid]
            );
            console.log('✅ Ponto de acesso cadastrado com sucesso!');
        }
        
        // Listar todos os APs
        const [aps] = await pool.query('SELECT ssid, bssid, sala FROM access_points WHERE ativo = 1');
        console.log('\n📡 Pontos de acesso cadastrados:');
        aps.forEach(ap => {
            console.log(`   ${ap.ssid} - ${ap.bssid} - ${ap.sala}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

cadastrarRedeCasa();
