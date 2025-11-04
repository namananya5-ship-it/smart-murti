import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SmartMurtiPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
          <h1 className="text-3xl font-bold mb-4">Smart Murti</h1>
          <p className="text-gray-700 mb-4">An intimate, voice-first devotional companion for homes. Play aartis, tell stories, and have gentle spiritual conversations with family-friendly AI personas.</p>

          <h3 className="font-semibold mt-4">Key features</h3>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Voice-first interactions (far-field mic)</li>
            <li>Ad-free devotional content and bhajans</li>
            <li>Family profiles & multi-user personalization</li>
          </ul>

          <div className="mt-6 flex gap-3">
            <Link href="/checkout?product=smart-murti&tier=basic"><Button>Preorder (Free)</Button></Link>
            <Link href="/pricing"><Button variant="outline">See Plans</Button></Link>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="w-full h-64 relative rounded-xl overflow-hidden shadow">
            <Image src="/images/god%20ganesh.png" alt="Smart Murti" fill className="object-contain" />
          </div>
        </div>
      </div>
    </div>
  )
}
