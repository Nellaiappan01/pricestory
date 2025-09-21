export default function CheckoutPage({ searchParams }: { searchParams: { plan?: string } }) {
  return (
    <div className="max-w-3xl mx-auto py-16 px-6">
      <h1 className="text-3xl font-bold mb-4">Checkout</h1>
      <p className="text-gray-600">
        Preparing checkout for plan: <strong>{searchParams.plan || "N/A"}</strong>
      </p>
      {/* TODO: Integrate Razorpay/Stripe here */}
    </div>
  );
}
