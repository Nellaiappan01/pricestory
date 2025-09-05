"use client";
import Image from "next/image";
import { motion } from "framer-motion";

export default function ProductCard({ product }: { product: any }) {
  return (
    <motion.article
      whileHover={{ scale: 1.04, y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="bg-white rounded-2xl shadow-md border border-gray-100 p-4 flex flex-col cursor-pointer"
    >
      <div className="aspect-[4/3] w-full relative rounded-lg overflow-hidden bg-gray-100">
        <Image
          src={product.img || "/sample-phone.jpg"}
          alt={product.title}
          fill
          style={{ objectFit: "cover" }}
        />
      </div>
      <h3 className="mt-3 font-semibold text-gray-900">{product.title}</h3>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-lg font-bold">₹{product.price}</div>
        <motion.a
          whileHover={{ scale: 1.1 }}
          className="ml-2 inline-block px-3 py-2 rounded-full bg-indigo-600 text-white text-sm"
        >
          Buy
        </motion.a>
      </div>
    </motion.article>
  );
}
