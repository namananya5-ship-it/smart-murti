"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function CheckoutPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const product = searchParams.get("product") || "smart-murti";
  const tier = searchParams.get("tier") || "basic";

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [country, setCountry] = useState("");
  const [postal, setPostal] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<null | { id: string; data: any }>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Optionally prefill if user data exists in localStorage
    const savedEmail = localStorage.getItem("sm_email");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName || !email) {
      setError("Please provide your name and email.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        product,
        tier,
        fullName,
        email,
        phone,
        address,
        city,
        state: stateVal,
        country,
        postal,
        notes,
        created_at: new Date().toISOString(),
      };

      const res = await fetch("/api/preorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Preorder failed");

      // Save email for convenience
      try {
        localStorage.setItem("sm_email", email);
      } catch {}

      setSuccess({ id: data.id, data: payload });
      setLoading(false);

      // Optional redirect to a thank-you page
      // router.push(`/checkout/success?order=${data.id}`)
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FCFAFF] p-6">
        <div className="max-w-xl w-full bg-white rounded-2xl p-8 shadow">
          <h2 className="text-2xl font-bold mb-4">Preorder received</h2>
          <p className="text-gray-700 mb-4">Thank you, {success.data.fullName} — your preorder for <strong>{product}</strong> ({tier}) was received.</p>
          <p className="text-sm text-gray-600 mb-6">Order ID: <code className="bg-gray-100 px-2 py-1 rounded">{success.id}</code></p>
          <Button onClick={() => router.push('/')}>Back to Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FCFAFF] py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl p-8 shadow">
          <h1 className="text-2xl font-bold mb-2">Checkout</h1>
          <p className="text-gray-600 mb-6">Preorder — {product} ({tier}) — Preorders are free.</p>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-medium">Full name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="Your full name" required />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium">Email</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="you@example.com" required />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium">Phone (optional)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="Mobile number" />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium">Address (optional)</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="Street address" />
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="City" />
              <input value={stateVal} onChange={(e) => setStateVal(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="State" />
              <input value={postal} onChange={(e) => setPostal(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="Postal code" />
            </div>

            <label className="flex flex-col">
              <span className="text-sm font-medium">Country</span>
              <input value={country} onChange={(e) => setCountry(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="Country" />
            </label>

            <label className="flex flex-col">
              <span className="text-sm font-medium">Notes (optional)</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1 px-3 py-2 border rounded" placeholder="Any additional details (e.g. deity selection or custom requests)" />
            </label>

            {error && <p className="text-red-600">{error}</p>}

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={loading}>{loading ? "Preordering..." : "Preorder (Free)"}</Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
