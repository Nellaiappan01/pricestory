// src/components/Features.tsx
export default function Features(){
  const items = [
    {title:'Real-time Alerts', desc:'Email/Telegram when price drops.'},
    {title:'Historical Charts', desc:'See price trends and lowest point.'},
    {title:'Affiliate Links', desc:'One-click buy with top retailers.'},
    {title:'Privacy-first', desc:'We avoid storing personal PII by default.'},
  ];
  return (
    <section className="max-w-6xl mx-auto px-6 py-16">
      <h2 className="text-3xl font-bold mb-6">Powerful features</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map(i => (
          <div key={i.title} className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <h3 className="font-semibold">{i.title}</h3>
            <p className="mt-2 text-sm text-gray-600">{i.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
