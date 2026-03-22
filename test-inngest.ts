import { PrismaClient } from '@prisma/client';
import { postToSNS } from './src/lib/sns';

async function test() {
  const prisma = new PrismaClient();
  const account = await prisma.account.findFirst({
    where: { provider: 'twitter', scope: 'cookie-auth' }
  });
  if (!account) return console.log('No cookie account');
  console.log('Testing postToSNS with Playwright...');
  
  const result = await postToSNS(account.userId, "twitter", "テスト自動投稿 via Playwright! " + new Date().toISOString());
  console.log('Result:', result);
}
test().catch(console.error).finally(() => process.exit(0));
