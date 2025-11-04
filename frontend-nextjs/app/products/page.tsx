import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"

const products = [
  {
    slug: "smart-murti",
    title: "Smart Murti",
    desc: "An AI-powered devotional companion for homes — voice-first, ad-free, and family friendly.",
    image: "/images/god%20ganesh.png",
  },
  {
    slug: "smart-mandir",
    title: "Smart Mandir",
    desc: "Enterprise-grade temple solution with multi-user access, scheduling and donation integration.",
    image: "/images/god%20ram.png",
  },
  {
    slug: "smart-guru",
    title: "Smart Guru",
    desc: "Advanced spiritual guidance (coming soon) — Smart Jyotish, Smart Pandit, and personalized guidance.",
    image: "/images/godess%20laxmi.png",
  }
]

export default function ProductsPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <h1 className="text-3xl md:text-4xl font-bold mb-6">Products</h1>
      <p className="text-gray-600 mb-8">Choose the product that fits your home or temple.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((p) => (
          <div key={p.slug} className="bg-white rounded-xl p-6 shadow">
            <div className="w-full h-40 relative mb-4 rounded-lg overflow-hidden">
              <Image src={p.image} alt={p.title} fill className="object-cover" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{p.title}</h2>
            <p className="text-gray-600 mb-4">{p.desc}</p>
            <div className="flex gap-2">
              <Link href={`/products/${p.slug}`}>
                <Button>View</Button>
              </Link>
              <Link href={`/checkout?product=${p.slug}&tier=basic`}>
                <Button variant="outline">Preorder (Free)</Button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
