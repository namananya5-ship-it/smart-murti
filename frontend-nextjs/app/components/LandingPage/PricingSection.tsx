import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import Link from "next/link";

const B2C_PRODUCTS = [
	{
		id: "smart-murti",
		title: "Smart Murti (Monthly)",
	},
	{
		id: "smart-mandir",
		title: "Smart Mandir",
	},
	{
		id: "smart-guru",
		title: "Smart Guru",
	},
];

const TIERS = [
	{
		id: "basic",
		label: "Basic",
		price: "Rs. 200",
		duration: "1 hour",
	},
	{
		id: "plus",
		label: "Plus",
		price: "Rs. 1500",
		duration: "10 hour",
	},
	{
		id: "premium",
		label: "Premium",
		price: "Rs. 3500",
		duration: "24 Hours",
	},
];

export const PricingSection = () => {
	return (
		<div className="w-full">
			<div className="text-center mb-8">
				<h2 className="text-3xl md:text-4xl font-bold">Pricing</h2>
				<p className="text-gray-600 mt-2">Choose a plan that fits your needs — for home devotees or temples.</p>
			</div>

			{/* B2C Products */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 px-4 md:px-0">
				{B2C_PRODUCTS.map((product) => (
					<div key={product.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
						<h3 className="text-xl font-bold mb-4">{product.title}</h3>

						<div className="space-y-4">
							{TIERS.map((tier) => (
								<div key={tier.id} className="p-4 border rounded-lg">
									<div className="flex items-baseline justify-between">
										<div>
											<div className="text-lg font-semibold">{tier.label} {product.id === 'smart-mandir' && (
												<span className="text-sm font-medium text-gray-500">{tier.id === 'basic' ? '(3 Deity included)' : tier.id === 'plus' ? '(7 Deity included)' : '(All Deity included)'}</span>
											)}</div>
											<div className="text-sm text-gray-600">{tier.duration}</div>
										</div>
										<div className="text-2xl font-bold">{tier.price}</div>
									</div>
									<ul className="mt-3 text-sm text-gray-700 space-y-2">
										<li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-amber-500" />AI Conversations</li>
										<li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-amber-500" />Aartis & Bhajans</li>
										<li className="flex items-center"><CheckCircle className="h-4 w-4 mr-2 text-amber-500" />Personalized Guidance</li>
									</ul>
									<div className="mt-4">
										<Link href={`/checkout?product=${product.id}&tier=${tier.id}`}>
											<Button className="w-full bg-orange-600 hover:bg-orange-700 text-white">Choose Plan</Button>
										</Link>
									</div>
								</div>
							))}
						</div>
					</div>
				))}
			</div>

			{/* B2B Temple Plan */}
			<div className="max-w-3xl mx-auto">
				<div className="bg-white border border-gray-100 rounded-2xl p-8 shadow-sm">
					<div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
						<div>
							<h3 className="text-2xl font-bold">Temple (Enterprise)</h3>
							<p className="text-gray-600 mt-2">Providing AI Setup Murti in all Available Deities Statue.</p>
						</div>
						<div className="w-full md:w-1/3">
							<Link href="/contact">
								<Button className="w-full bg-amber-500 hover:bg-amber-600 text-white">Contact Sales</Button>
							</Link>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};