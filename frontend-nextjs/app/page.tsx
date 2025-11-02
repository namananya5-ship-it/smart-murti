import Link from "next/link"
import { ChevronRight, Home, ShieldCheck } from "lucide-react" // Changed icons for relevance
import { Button } from "@/components/ui/button"
import Image from "next/image";
import YoutubeDemo from "./components/LandingPage/YoutubeDemo";
import DeviceImage from "./components/LandingPage/DeviceImage";
import { PricingSection } from "./components/LandingPage/PricingSection";

// --- Data for Murtis and Plans (based on your pitch deck) ---
const divineCompanions = [
  { name: "Lord Brahma", description: "Creator and source of knowledge.", imageSrc: "/images/god%20bhrama.png" },
  { name: "Lord Ganesh", description: "For wisdom, success, and overcoming obstacles.", imageSrc: "/images/god%20ganesh.png" },
  { name: "Lord Hanuman", description: "For immense strength, selfless service, and devotion.", imageSrc: "/images/god%20hanuman.png" },
  { name: "Lord Ram", description: "For guidance on dharma and righteous living.", imageSrc: "/images/god%20ram.png" },
  { name: "Sai Baba", description: "Compassionate guide for seekers of all faiths.", imageSrc: "/images/god%20sai%20baba.png" },
  { name: "Lord Shiva", description: "For transformation, stillness, and deep meditation.", imageSrc: "/images/god%20shiva.png" },
  { name: "Goddess Laxmi", description: "Blessings of prosperity and well-being.", imageSrc: "/images/godess%20laxmi.png" },
  { name: "Goddess Parvati", description: "Compassion, devotion, and strength.", imageSrc: "/images/Godess%20Parvati.png" }
];

export default async function LandingPage() {
  // Removed Supabase client and data fetching for personalities/github stars

  return (
    <div className="flex min-h-screen flex-col bg-[#FCFAFF]">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-20">
          <div className="container px-4 md:px-6 max-w-screen-lg mx-auto">
            <div className="grid gap-6 lg:gap-12 items-center">
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
                  <span className="ml-2 text-gray-700">AI-powered devotional experiences that respond, guide, and inspire</span>
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

              {/* hero image removed per request; keep hero centered */}
            </div>
          </div>
        </section>

        {/* Why Smart Murti? (Problem) */}
        <section className="w-full py-12 bg-white">
          <div className="container px-4 md:px-6 max-w-screen-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold">Why Smart Murti?</h2>
              <p className="text-lg text-gray-600 mt-2">Connecting Generations in a Distracted World</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image src="/images/feature1.png" alt="children icon" width={48} height={48} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">For Children</h3>
                  <p className="text-gray-600">High screen time and short attention spans are causing a disconnect from cultural values.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image src="/images/feature2.png" alt="adults icon" width={48} height={48} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">For Adults</h3>
                  <p className="text-gray-600">Modern life is filled with anxiety, burnout, and a loss of balance.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image src="/images/feature3.png" alt="elders icon" width={48} height={48} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">For Elders</h3>
                  <p className="text-gray-600">Loneliness and isolation are common, separating them from traditional worship routines.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 flex items-center justify-center">
                  <Image src="/images/feature4.png" alt="families icon" width={48} height={48} />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">For Families</h3>
                  <p className="text-gray-600">Passive worship with static idols or ad-filled apps lacks the personal connection and spiritual depth we crave.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Solution section removed per request */}

        <YoutubeDemo caption="Smart Murti AI Demo" />

        {/* How It Works (Technology) */}
        <section className="w-full py-12 bg-gradient-to-b from-orange-50 to-white">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div className="order-2 md:order-1">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
                <p className="text-gray-600 mb-6">Smart Murti is a real, tangible device paired with a devotional AI stack — designed to bring focus and connection back to your home or temple.</p>

                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold">1</div>
                    <div>
                      <h4 className="font-semibold">Welcome Your Murti</h4>
                      <p className="text-gray-600">Choose your AI-powered deity (Ganesh, Ram, Hanuman, and more).</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold">2</div>
                    <div>
                      <h4 className="font-semibold">Just Ask</h4>
                      <p className="text-gray-600">Use your voice to request aarti, listen to a story, or ask a spiritual question.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-bold">3</div>
                    <div>
                      <h4 className="font-semibold">Experience Peace</h4>
                      <p className="text-gray-600">Receive personalized guidance, bhajans, and meditations from an AI trained on sacred scriptures.</p>
                    </div>
                  </div>
                </div>

                {/* Prototype labeled-parts removed per request */}
              </div>

              <div className="order-1 md:order-2 flex items-center justify-center">
                <div className="w-full max-w-md">
                  <Image src="/images/Smart%20Murti%20Device.jpg" alt="Smart Murti device" width={700} height={500} className="rounded-2xl shadow-lg object-cover" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Our Unfair Advantage (Trust) */}
        <section className="w-full py-12 bg-white">
          <div className="container px-4 md:px-6 max-w-screen-lg mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-3xl md:text-4xl font-bold">Unlike Anything Else</h2>
              <p className="text-gray-600 mt-2">General-purpose assistants don't understand devotion, and apps interrupt your prayer with ads. Our platform is different.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4">
                <h4 className="font-semibold">True Devotional AI</h4>
                <p className="text-gray-600">Our AI is trained on the Bhagavad Gita, Vedas, and regional traditions — not just the open web.</p>
              </div>
              <div className="p-4">
                <h4 className="font-semibold">Always Ad-Free</h4>
                <p className="text-gray-600">We promise an uninterrupted spiritual experience — our subscription model means no ads.</p>
              </div>
              <div className="p-4">
                <h4 className="font-semibold">Built for Community</h4>
                <p className="text-gray-600">Designed for homes and temples, our platform fosters shared faith, not just individual use.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Our Products (Ecosystem of Faith) */}
        <section className="w-full py-12 bg-gradient-to-b from-gray-50 to-white">
          <div className="container px-4 md:px-6 max-w-screen-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-3xl md:text-4xl font-bold">An Ecosystem of Faith</h2>
              <p className="text-gray-600 mt-2">Explore the offerings tailored for homes, temples, and advanced spiritual guidance.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg p-6 text-center">
                <h3 className="font-bold text-lg">Smart Murti (For Homes)</h3>
                <p className="text-gray-600 mt-2">The AI-powered companion for families and individuals.</p>
                <Link href="/products">
                  <Button className="mt-4">Explore</Button>
                </Link>
              </div>
              <div className="bg-white rounded-lg p-6 text-center">
                <h3 className="font-bold text-lg">Smart Mandir (For Temples)</h3>
                <p className="text-gray-600 mt-2">A complete AI integration offering multi-user access and community features.</p>
                <Link href="/temples">
                  <Button className="mt-4">Learn More</Button>
                </Link>
              </div>
              <div className="bg-white rounded-lg p-6 text-center">
                <h3 className="font-bold text-lg">Smart Guru (Coming Soon)</h3>
                <p className="text-gray-600 mt-2">Personalized guidance: Smart Jyotish, Smart Pandit, and Smart Yogi.</p>
                <Button className="mt-4" disabled>Coming Soon</Button>
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
                  <div className="mx-auto mb-4 w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden relative">
                    <Image src={companion.imageSrc} alt={companion.name} fill className="object-cover" />
                  </div>
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