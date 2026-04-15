const mysql = require('mysql2/promise');
require('dotenv').config();

async function corrigirBSSID() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'gateway01.us-east-1.prod.aws.tidbcloud.com',
        port: parseInt(process.env.DB_PORT) || 4000,
        user: process.env.DB_USER || '2q5LT5zV9doJdyc.root',
        password: process.env.DB_PASSWORD || 'kWglXVhB3uX5GzCO',
        database: process.env.DB_NAME || 'frequentar_db',
        ssl: { minVersion: 'TLSv1.2', rejectUnauthorized: true }
    });

    try {
        // BSSID correto detectado pelo app
        const bssidCorreto = '86:0b:bb:d7:81:65';
        const ssid = 'ROCHA MIGUEZ';
        
        // Verificar o BSSID atual
        const [atual] = await pool.query(
            'SELECT bssid FROM access_points WHERE ssid = ?',
            [ssid]
        );
        
        console.log(`📡 BSSID atual de ${ssid}: ${atual[0]?.bssid}`);
        console.log(`📡 BSSID detectado pelo app: ${bssidCorreto}`);
        
        // Atualizar para o BSSID correto
        await pool.query(
            'UPDATE access_points SET bssid = ? WHERE ssid = ?',
            [bssidCorreto, ssid]
        );
        
        console.log(`✅ BSSID da rede ${ssid} atualizado para: ${bssidCorreto}`);
        
        // Verificar todos os APs
        const [aps] = await pool.query('SELECT ssid, bssid, sala FROM access_points');
        console.log('\n📡 Pontos de acesso atualizados:');
        aps.forEach(ap => {
            console.log(`   ${ap.ssid} - ${ap.bssid} - ${ap.sala}`);
        });
        
    } catch (error) {
        console.error('❌ Erro:', error);
    } finally {
        await pool.end();
    }
}

corrigirBSSID();
