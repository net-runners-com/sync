// Script to merge or clean up DB so we can test linking
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accounts = await prisma.account.findMany({
    where: { provider: 'twitter' }
  });
  
  console.log("Current Twitter Accounts:", accounts.map(a => ({ id: a.id, userId: a.userId, providerAccountId: a.providerAccountId })));

  // ユーザーの意図としては、複数アカウントを1つのユーザーにまとめたい。
  // 最初に作られたユーザーに全てのアカウントを紐付ける。
  const targetUserId = "cmmpuue70000014mso6550afk";

  for (const acc of accounts) {
    if (acc.userId !== targetUserId) {
      console.log(`Moving account ${acc.providerAccountId} to userId ${targetUserId}`);
      await prisma.account.update({
        where: { id: acc.id },
        data: { userId: targetUserId }
      });
    }
  }
  
  console.log("Cleanup finished.");
}

main().finally(() => prisma.$disconnect());
