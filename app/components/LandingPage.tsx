"use client";

import Link from 'next/link';
import Image from 'next/image';
import { Globe, MapPin, DollarSign, MessageSquare, Backpack, Sparkles } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      {/* Hero Section with Background Image */}
      <div className="relative min-h-[90vh] flex flex-col">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/market-huaraz.jpg"
            alt="Local market in Huaraz, Peru"
            fill
            className="object-cover"
            priority
          />
          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-stone-900/80 via-stone-900/60 to-stone-900" />
        </div>

        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-center md:justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-2 font-mono">
            <Globe size={24} className="text-orange-500" />
            <span className="font-semibold text-lg">superglobal.travel</span>
          </div>
          {/* Hide nav buttons on mobile - hero CTA buttons are visible */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-stone-200 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/beta"
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Sparkles size={16} />
              Join Beta
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 flex-1 flex items-center justify-center">
          <div className="max-w-4xl mx-auto px-6 py-20 text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight drop-shadow-lg">
              Prepare for your next
              <span className="text-orange-400"> great adventure</span>
            </h1>
            <p className="text-xl text-stone-100 mb-8 max-w-2xl mx-auto drop-shadow-md">
              Collaborate with a smart travel assistant that knows your travel style, budget, and preferences to build the perfect trip plan.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/beta"
                className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center gap-2 shadow-lg"
              >
                <Sparkles size={20} />
                Join Beta
              </Link>
              <Link
                href="/auth/login"
                className="text-white hover:text-orange-200 px-8 py-4 rounded-xl font-medium text-lg transition-colors border border-white/30 hover:border-white/50 backdrop-blur-sm"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="relative z-10 pb-8 flex justify-center">
          <div className="animate-bounce">
            <svg className="w-6 h-6 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Everything you need to plan your adventure</h2>
        <p className="text-stone-400 text-center mb-12 max-w-2xl mx-auto">
          Superglobal combines smart travel advice with practical tools to keep your trip organized and on budget.
        </p>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6 hover:border-stone-600 transition-colors">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Travel Advisor</h3>
            <p className="text-stone-400">
              Get personalized recommendations for hostels, restaurants, and activities based on your travel style and budget.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6 hover:border-stone-600 transition-colors">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Budget Tracking</h3>
            <p className="text-stone-400">
              Automatically extract costs from your conversations and track spending across accommodation, food, activities, and transport.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6 hover:border-stone-600 transition-colors">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Interactive Map</h3>
            <p className="text-stone-400">
              See all your recommended spots pinned on a map. Plan routes, visualize your itinerary, and never lose track of that cool bar someone mentioned.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6 hover:border-stone-600 transition-colors">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <Backpack className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Packing Lists</h3>
            <p className="text-stone-400">
              Dynamic packing lists based on your destination, travel style, and trip duration. Never forget your travel adapter again.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6 hover:border-stone-600 transition-colors">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <Globe className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Trip Support</h3>
            <p className="text-stone-400">
              Plan multiple trips at once. Each trip has its own chat history, budget tracker, and map pins.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6 hover:border-stone-600 transition-colors">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <svg className="text-orange-500 w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Traveler Profiles</h3>
            <p className="text-stone-400">
              Set your preferences once - accommodation style, transport mode, dietary needs - and get recommendations tailored to you.
            </p>
          </div>
        </div>
      </div>

      {/* Beta CTA Section with Lake Background */}
      <div className="relative overflow-hidden">
        {/* Background Image */}
        <div className="absolute inset-0">
          <Image
            src="/images/blue-lake.jpg"
            alt="Mountain lake adventure"
            fill
            className="object-cover"
          />
          {/* Dark overlay for text readability */}
          <div className="absolute inset-0 bg-stone-900/70" />
        </div>

        <div className="relative max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="inline-flex items-center gap-2 bg-stone-900/50 backdrop-blur-sm border border-orange-500/30 rounded-full px-4 py-2 mb-6">
            <Sparkles size={16} className="text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">Now accepting beta testers</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 drop-shadow-lg">Want early access?</h2>
          <p className="text-stone-200 mb-8 text-lg drop-shadow-md">
            Join our beta program and help shape the future of travel planning.
          </p>
          <Link
            href="/beta"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors shadow-lg"
          >
            <Sparkles size={20} />
            Schedule a Call
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-stone-500 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Globe size={16} className="text-orange-500" />
          <span className="font-mono">superglobal.travel</span>
        </div>
        <p className="mb-2">&copy; 2025 Superglobal. Happy travels!</p>
        <p>
          Powered by{' '}
          <a
            href="https://www.thebrokebackpacker.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-orange-400 hover:text-orange-300"
          >
            The Broke Backpacker
          </a>
        </p>
      </footer>
    </div>
  );
}
