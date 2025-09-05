// src/components/PricingCTA.tsx
export default function PricingCTA(){
  return (
    <section id="pricing" className="max-w-6xl mx-auto px-6 py-16">
      <h3 className="text-3xl font-bold mb-6">Plans for everyone</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-gray-100">
          <div className="text-sm text-gray-500">Free</div>
          <div className="text-2xl font-bold mt-2">₹0</div>
          <ul className="mt-4 text-sm text-gray-600 space-y-2">
            <li>Track 5 products</li>
            <li>5 alerts / month</li>
          </ul>
          <div className="mt-4"><button className="btn-secondary w-full">Get Free</button></div>
        </div>
        <div className="p-6 bg-gradient-to-br from-brand-500 to-accent-500 text-white rounded-2xl shadow-lg transform scale-105">
          <div className="text-sm opacity-90">Pro</div>
          <div className="text-2xl font-bold mt-2">₹99 / month</div>
          <ul className="mt-4 text-sm opacity-90 space-y-2">
            <li>Track 100 products</li>
            <li>Unlimited alerts</li>
            <li>Priority queue</li>
          </ul>
          <div className="mt-4"><button className="btn-primary w-full bg-white text-brand-600">Start Pro</button></div>
        </div>
        <div className="p-6 bg-white rounded-2xl border border-gray-100">
          <div className="text-sm text-gray-500">Business</div>
          <div className="text-2xl font-bold mt-2">Custom</div>
          <ul className="mt-4 text-sm text-gray-600 space-y-2">
            <li>API access</li>
            <li>CSV exports</li>
          </ul>
          <div className="mt-4"><button className="btn-secondary w-full">Contact Sales</button></div>
        </div>
      </div>
    </section>
  );
}
