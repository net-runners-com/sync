import { PrismaClient } from '@prisma/client';
import { Scraper } from 'agent-twitter-client';

async function test() {
  const prisma = new PrismaClient();
  const account = await prisma.account.findFirst({
    where: { provider: 'twitter', scope: 'cookie-auth' }
  });
  if (!account) return console.log('No cookie account');
  
  const scraper = new Scraper();
  await scraper.setCookies([
    `auth_token=${account.access_token}; Domain=.twitter.com; Path=/; Secure; HttpOnly`,
    `ct0=${account.refresh_token}; Domain=.twitter.com; Path=/; Secure; HttpOnly`
  ]);

  scraper.isLoggedIn = async () => true;
  if ((scraper as any).auth) {
    (scraper as any).auth.isLoggedIn = async () => true;
  }

  try {
    const profile = await scraper.getProfile('elonmusk');
    console.log('Successfully fetched profile!', profile.username);
  } catch (e) {
    console.error('Failed to fetch profile:', e);
  }
}
test().catch(console.log).finally(() => process.exit(0));
