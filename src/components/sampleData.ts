// src/components/sampleData.ts
export type PricePoint = { t: string; p: number };

export type Product = {
  id: string;
  title: string;
  price: number;
  url: string;
  priceHistory: PricePoint[];
};

export const sampleProducts: Product[] = [
  {
    id: "1",
    title: "Noise-Cancelling Headphones — Black",
    price: 3499,
    url: "https://www.flipkart.com/item/1",
    priceHistory: [
      { t: "Day 1", p: 3999 },
      { t: "Day 2", p: 3899 },
      { t: "Day 3", p: 3799 },
      { t: "Day 4", p: 3599 },
      { t: "Day 5", p: 3499 },
    ],
  },
  {
    id: "2",
    title: "Smart Fitness Band — Pro",
    price: 1299,
    url: "https://www.flipkart.com/item/2",
    priceHistory: [
      { t: "D1", p: 1499 },
      { t: "D2", p: 1399 },
      { t: "D3", p: 1349 },
      { t: "D4", p: 1299 },
    ],
  },
];
