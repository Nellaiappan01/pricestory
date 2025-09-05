// src/components/Testimonials.tsx
export default function Testimonials(){
  const t = [
    {name:'Anita', text:'Saved ₹3,000 on my laptop thanks to alerts!'},
    {name:'Ravi', text:'Easy to use and accurate price history.'},
    {name:'Nisha', text:'Love the mobile UI and fast alerts.'},
  ];
  return (
    <section className="bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-6">
        <h3 className="text-2xl font-bold mb-6">Loved by shoppers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {t.map((x, idx)=>(
            <div key={idx} className="p-6 bg-white rounded-xl shadow-sm">
              <div className="text-sm text-gray-700">“{x.text}”</div>
              <div className="mt-4 text-sm font-semibold">{x.name}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
