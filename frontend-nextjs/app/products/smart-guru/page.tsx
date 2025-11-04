import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SmartGuruPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-12">
      <div className="grid md:grid-cols-2 gap-8 items-start">
        <div>
          <h1 className="text-3xl font-bold mb-4">Smart Guru</h1>
          <p className="text-gray-700 mb-4">Coming soon — Smart Guru bundles personalized spiritual guidance, jyotish, and priestly services delivered through our AI ecosystem.</p>

          <h3 className="font-semibold mt-4">Planned capabilities</h3>
          <ul className="list-disc pl-5 text-gray-600">
            <li>Personalized daily guidance and rituals</li>
            <li>Smart Jyotish integrations and personalized muhurats</li>
            <li>Guided practices and advanced Q&A</li>
          </ul>

          <div className="mt-6 flex gap-3">
            <Link href="/checkout?product=smart-guru&tier=basic"><Button disabled>Request Invite</Button></Link>
            <Link href="/pricing"><Button variant="outline">See Plans</Button></Link>
          </div>
        </div>

        <div className="w-full max-w-md">
          <div className="w-full h-64 relative rounded-xl overflow-hidden shadow">
            <Image src="/images/godess%20laxmi.png" alt="Smart Guru" fill className="object-contain" />
          </div>
        </div>
      </div>
    </div>
  )
}
