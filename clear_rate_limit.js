// .env.local を読み込む
require('dotenv').config({ path: '.env.local' });

// Upstash Redis のレート制限をクリア
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function clearRateLimit() {
  if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
    console.error('❌ エラー: 環境変数が設定されていません');
    console.log('UPSTASH_REDIS_REST_URL:', UPSTASH_REDIS_REST_URL ? '設定済み' : '未設定');
    console.log('UPSTASH_REDIS_REST_TOKEN:', UPSTASH_REDIS_REST_TOKEN ? '設定済み' : '未設定');
    return;
  }

  console.log('レート制限をクリアしています...');
  
  // すべてのレート制限キーを取得
  const scanResponse = await fetch(
    `${UPSTASH_REDIS_REST_URL}/scan/0/match/*/count/1000`,
    {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      },
    }
  );
  
  const scanData = await scanResponse.json();
  const keys = scanData.result[1];
  
  console.log(`削除するキー数: ${keys.length}`);
  
  // すべてのキーを削除
  for (const key of keys) {
    await fetch(`${UPSTASH_REDIS_REST_URL}/del/${key}`, {
      headers: {
        Authorization: `Bearer ${UPSTASH_REDIS_REST_TOKEN}`,
      },
    });
  }
  
  console.log('✅ レート制限をクリアしました');
}

clearRateLimit().catch(console.error);