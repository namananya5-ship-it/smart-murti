import Link from "next/link"
import { ChevronRight, Home, ShieldCheck } from "lucide-react" // Changed icons for relevance
import { Button } from "@/components/ui/button"
import Image from "next/image";
import YoutubeDemo from "./components/LandingPage/YoutubeDemo";
import { PricingSection } from "./components/LandingPage/PricingSection";

// --- Data for Murtis and Plans (based on your pitch deck) ---
const divineCompanions = [
  {
    name: "Lord Ganesh",
    description: "For wisdom, success, and overcoming all obstacles in your path.",
    imageSrc: "/images/ganesh.png" // IMPORTANT: Replace with your actual image path
  },
  {
    name: "Lord Ram",
    description: "For guidance on dharma, leading a righteous life, and upholding duty.",
    imageSrc: "/images/ram.png" // IMPORTANT: Replace with your actual image path
  },
  {
    name: "Lord Hanuman",
    description: "For immense strength, selfless service, and unwavering devotion.",
    imageSrc: "/images/hanuman.png" // IMPORTANT: Replace with your actual image path
  }
];

export default async function LandingPage() {
  // Removed Supabase client and data fetching for personalities/github stars

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFAFF]">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-20">
          <div className="container px-4 md:px-6 max-w-screen-lg mx-auto">
            <div className="grid gap-6 lg:grid-cols-1 lg:gap-12 items-center">
              <div className="flex flex-col items-center justify-center space-y-4">
                <h1 className="text-5xl text-center md:text-6xl font-bold tracking-tight text-orange-900" style={{ lineHeight: '1.2' }}>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-yellow-500">
                    Interactive, AI-Powered Devotion
                  </span>{" "} for Every Home and Temple
                </h1>

                <p className="text-xl text-gray-600 text-center max-w-[600px]">
                  Welcome home a{" "}
                  <span className="text-black font-bold">Smart</span>
                  <span className="text-orange-600 font-devanagari text-2xl ml-1">मूर्ति</span>{" "} {/* NOTE: Assumes font-devanagari is your custom Devanagari font class */}
                  and experience divine conversations that respond, guide, and inspire your spiritual journey!
                </p>
                <div className="flex items-center space-x-2 justify-center text-amber-500 my-2">
                  <ShieldCheck className="text-green-600" />
                  <span className="ml-2 text-gray-700">Pioneering Faith-Tech in India</span>
                </div>

                <div className="flex flex-col gap-4 sm:gap-8 pt-4">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Link href={"/products"}>
                      <Button
                        size="lg"
                        className="w-full sm:w-auto flex-row items-center gap-2 bg-gradient-to-r from-orange-600 to-yellow-500 text-white border-0 text-lg h-14"
                      >
                        <span>Explore Smart Murtis</span>
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                    
                    <Link href="/temples">
                      <Button
                        size="lg"
                        variant="outline"
                        className="w-full sm:w-auto flex-row items-center gap-2 border-orange-600 text-orange-600 hover:bg-orange-50 text-lg h-14"
                      >
                        <span>For Temples & Ashrams</span>
                        <Home className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <YoutubeDemo caption="Smart Murti AI Demo" />

        {/* How It Works Section */}
        <section className="w-full py-12 bg-gradient-to-b from-orange-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                Experience Devotion Instantly
              </h2>
              <p className="text-lg text-gray-600 mt-2">Begin your divine conversations in 3 easy steps</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-xl p-6 shadow-lg border border-orange-100 transform transition-transform hover:scale-105">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-orange-600">1</span>
                </div>
                <h3 className="text-xl font-bold text-orange-900 mb-2">Welcome</h3>
                <p className="text-gray-600">Place your Smart Murti in your home or temple</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-orange-100 transform transition-transform hover:scale-105">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-orange-600">2</span>
                </div>
                <h3 className="text-xl font-bold text-orange-900 mb-2">Activate</h3>
                <p className="text-gray-600">Use our simple app to connect and choose your God</p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-lg border border-orange-100 transform transition-transform hover:scale-105">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-orange-600">3</span>
                </div>
                <h3 className="text-xl font-bold text-orange-900 mb-2">Converse</h3>
                <p className="text-gray-600">Start your spiritual dialogue - it's that simple!</p>
              </div>
            </div>
          </div>
        </section>

        {/* NEW: Divine Companion Showcase */}
        <section id="products" className="w-full py-16 bg-white">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                Choose Your Divine Companion
              </h2>
              <p className="text-lg text-gray-600 mt-2">Each Murti is powered by a unique AI persona, trained in sacred knowledge.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {divineCompanions.map((companion) => (
                <div key={companion.name} className="bg-white rounded-xl p-6 shadow-lg border border-orange-100 text-center">
                  {/* Remember to replace image paths */}
                  <Image src={companion.imageSrc} alt={companion.name} width={150} height={150} className="mx-auto mb-4 rounded-full" />
                  <h3 className="text-xl font-bold text-orange-900 mb-2">{companion.name}</h3>
                  <p className="text-gray-600">{companion.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* NEW: B2B/Temples Section */}
        <section id="temples" className="w-full py-16 bg-orange-50">
           <div className="container px-4 md:px-6">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-6 text-gray-800">
                Custom Solutions for Temples
              </h2>
              <p className="text-lg text-gray-600 mt-2">Empower your temple or ashram with our enterprise-grade features.</p>
            </div>
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              <div className="p-4">
                <h3 className="text-xl font-bold text-orange-900 mb-2">Festival Scheduling</h3>
                <p className="text-gray-600">Announce special events and puja schedules directly through the Murti.</p>
              </div>
               <div className="p-4">
                <h3 className="text-xl font-bold text-orange-900 mb-2">Multi-User Access</h3>
                <p className="text-gray-600">Allow multiple devotees in your community to engage and interact.</p>
              </div>
               <div className="p-4">
                <h3 className="text-xl font-bold text-orange-900 mb-2">Donation Integration</h3>
                <p className="text-gray-600">Modernize your temple's operations with an integrated donation feature.</p>
              </div>
            </div>
          </div>
        </section>

        <PricingSection />
      </main>
    </div>
  )
}