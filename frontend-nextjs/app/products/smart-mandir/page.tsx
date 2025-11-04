import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SmartMandirPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
          <h1 className="text-3xl font-bold mb-4">Smart Mandir</h1>
          <p className="text-gray-700 mb-4">A temple-grade solution for ashrams and mandirs — multi-user access, festival scheduling, donation integration, and curated rituals.</p>

          <h3 className="font-semibold mt-4">Temple-focused features</h3>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Multi-user accounts for pujari and staff</li>
            <li>Festival & aarti scheduling with announcements</li>
            <li>Donation integration and reporting</li>
            <li>Priority support and custom deployment options</li>
          </ul>

          <div className="mt-6 flex gap-3">
            <Link href="/checkout?product=smart-mandir&tier=basic"><Button>Contact Sales / Preorder</Button></Link>
            <Link href="/pricing"><Button variant="outline">See Plans</Button></Link>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="w-full h-64 relative rounded-xl overflow-hidden shadow">
            <Image src="/images/god%20ram.png" alt="Smart Mandir" fill className="object-contain" />
          </div>
        </div>
      </div>
    </div>
  )
}
