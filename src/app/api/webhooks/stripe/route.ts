import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature") as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || "whsec_test_mock"
    );
  } catch (error: any) {
    console.error(`Webhook Error: ${error.message}`);
    return new NextResponse(`Webhook Error: ${error.message}`, { status: 400 });
  }

  const session = event.data.object as Stripe.Checkout.Session;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        // 初回決済完了時
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          if (session?.metadata?.userId) {
            await prisma.user.update({
              where: { id: session.metadata.userId },
              data: {
                stripeSubscriptionId: subscription.id,
                stripeCustomerId: subscription.customer as string,
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
                plan: "PRO", // プラン種別は本来 price.id によって分岐させます
              },
            });
          }
        }
        break;
      }
      case "invoice.payment_succeeded": {
        // 次回のサブスクリプション更新成功時
        const invoice = event.data.object as any;
        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
          await prisma.user.update({
            where: { stripeSubscriptionId: subscription.id },
            data: {
              stripePriceId: subscription.items.data[0].price.id,
              stripeCurrentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
            },
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        // サブスクリプション解約・終了時
        const subscription = event.data.object as Stripe.Subscription;
        await prisma.user.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            plan: "FREE",
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
        break;
      }
      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (error: any) {
    console.error(`Database Update Error: ${error.message}`);
    return new NextResponse(`Database Update Error: ${error.message}`, { status: 500 });
  }

  return new NextResponse("OK", { status: 200 });
}
