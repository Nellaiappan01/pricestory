// src/app/products/[id]/page.tsx
import { ObjectId } from "mongodb";
import { getDb } from "../../../lib/mongodb"; // relative: src/app/products/[id] -> src/lib

type Params = { params: { id: string } };

export default async function ProductPage({ params }: Params) {
  const id = params.id;
  let product: any = null;

  try {
    const db = await getDb();
    product = await db.collection("products").findOne({ _id: new ObjectId(id) });
  } catch (err) {
    // Narrow `err` safely: TypeScript treats catch variable as `unknown`
    const errInfo = err instanceof Error ? (err.stack || err.message) : String(err ?? "unknown error");
    console.error("DB fetch error", errInfo);
  }

  if (!product) {
    return (
      <main className="p-8 max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">Product not found</h1>
        <p className="mt-4">This product may not exist or has been removed.</p>
      </main>
    );
  }

  const history = (product.priceHistory || [])
    .slice()
    .sort((a: any, b: any) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .map((p: any) => ({ at: p.at, price: p.price }));

  const currentPrice = product.currentPrice ?? (history.length ? history[history.length - 1].price : null);
  const lowest = history.length ? Math.min(...history.map((h: any) => h.price)) : null;

  // --- NEW: compute prices / svg points with explicit types to avoid implicit any ---
  const prices: number[] = history.map((h: any) => Number(h.price ?? 0));
  const points: string = history.length
    ? history
        .map((h: any, i: number) => {
          const x = (i / (history.length - 1)) * 200;
          const min = Math.min(...prices);
          const max = Math.max(...prices);
          const range = max - min || 1;
          const y = 60 - ((Number(h.price ?? 0) - min) / range) * 50;
          return `${x},${y}`;
        })
        .join(" ")
    : "0,50 50,45 100,48 150,35 200,30";
  // -------------------------------------------------------------------------------

  return (
    <main className="p-8 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-3xl font-extrabold">{product.title || product.url}</h1>
        <div className="mt-2 text-sm text-gray-600">Tracked since: {new Date(product.createdAt).toLocaleDateString()}</div>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <div className="bg-white rounded-2xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Current price</div>
                <div className="text-2xl font-bold">₹{currentPrice ?? "N/A"}</div>
              </div>
              <div className="text-right text-sm text-gray-600">
                <div>Lowest: ₹{lowest ?? "N/A"}</div>
              </div>
            </div>

            <div className="mt-6">
              {/* lightweight inline sparkline - simple SVG */}
              <svg viewBox="0 0 200 60" className="w-full h-28">
                <polyline fill="none" stroke="#6366F1" strokeWidth="3" points={points} />
              </svg>
            </div>

            <div className="mt-6 flex gap-3">
              <a className="px-4 py-2 bg-indigo-600 text-white rounded-md" href={product.affiliateUrl || product.url} target="_blank" rel="noreferrer">Buy Now</a>
              <button className="px-4 py-2 border rounded-md">Watch Price</button>
            </div>
          </div>
        </div>

        <aside className="hidden md:block">
          <div className="bg-white rounded-2xl shadow p-6">
            <h4 className="font-semibold">Quick info</h4>
            <div className="mt-3 text-sm text-gray-700 space-y-2">
              <div><strong>URL:</strong> <span className="text-xs text-gray-500 break-all">{product.url}</span></div>
              <div><strong>Last checked:</strong> {product.lastChecked ? new Date(product.lastChecked).toLocaleString() : "Not yet"}</div>
              <div><strong>History points:</strong> {history.length}</div>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
