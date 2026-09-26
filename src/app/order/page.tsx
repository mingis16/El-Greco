import type { Metadata } from "next";
import { Checkout } from "@/components/ordering/checkout";
import { getMenu } from "@/lib/menu";
import { availablePaymentMethods } from "@/lib/ordering/service";

export const metadata: Metadata = {
  title: "Your order",
  description: "Order food and drinks from El Greco Kafe - Resto for your table or for pickup.",
  robots: { index: false, follow: true },
};

export default async function OrderPage() {
  const menu = await getMenu();
  return (
    <>
      <section className="bg-charcoal-900 text-cream">
        <div className="container-page py-10 sm:py-12">
          <p className="eyebrow text-mint-400">Order online</p>
          <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Checkout</h1>
          <p className="mt-2 max-w-xl text-charcoal-200">
            Order to your table or for pickup. Prices are checked by the kitchen&apos;s system and shown in full before you order.
          </p>
        </div>
        <div aria-hidden className="meander opacity-50" />
      </section>
      <section className="container-page py-10 sm:py-14">
        <Checkout categories={menu.categories} paymentMethods={availablePaymentMethods()} />
      </section>
    </>
  );
}
