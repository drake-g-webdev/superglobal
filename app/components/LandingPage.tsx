"use client";

import Link from 'next/link';
import { Globe, MapPin, DollarSign, MessageSquare, Backpack, ArrowRight } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-stone-900 to-stone-900" />

        {/* Navigation */}
        <nav className="relative z-10 flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 font-mono">
            <Globe size={24} className="text-orange-500" />
            <span className="font-semibold text-lg">superglobal.travel</span>
          </div>
          {/* Hide nav buttons on mobile - hero CTA buttons are visible */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/auth/login"
              className="text-stone-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signup"
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Sign up
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Prepare for your next
            <span className="text-orange-500"> great adventure</span>
          </h1>
          <p className="text-xl text-stone-300 mb-8 max-w-2xl mx-auto">
            Plan your trip with a smart travel assistant that knows hostels, local food, and off-the-beaten-path experiences.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/signup"
              className="bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors flex items-center gap-2"
            >
              Start Planning <ArrowRight size={20} />
            </Link>
            <Link
              href="/auth/login"
              className="text-stone-300 hover:text-white px-8 py-4 rounded-xl font-medium text-lg transition-colors border border-stone-700 hover:border-stone-600"
            >
              I already have an account
            </Link>
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
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <MessageSquare className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Travel Advisor</h3>
            <p className="text-stone-400">
              Get personalized recommendations for hostels, restaurants, activities, and hidden gems based on your travel style and budget.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <DollarSign className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Budget Tracking</h3>
            <p className="text-stone-400">
              Automatically extract costs from your conversations and track spending across accommodation, food, activities, and transport.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <MapPin className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Interactive Map</h3>
            <p className="text-stone-400">
              See all your recommended spots pinned on a map. Plan routes, visualize your itinerary, and never lose track of that cool bar someone mentioned.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <Backpack className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Packing Lists</h3>
            <p className="text-stone-400">
              Dynamic packing lists based on your destination, travel style, and trip duration. Never forget your travel adapter again.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4">
              <Globe className="text-orange-500" size={24} />
            </div>
            <h3 className="text-xl font-semibold mb-2">Multi-Trip Support</h3>
            <p className="text-stone-400">
              Plan multiple trips at once. Each trip has its own chat history, budget tracker, and map pins.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-6">
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

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-orange-600/20 to-orange-500/10 border-y border-orange-500/20">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for your next adventure?</h2>
          <p className="text-stone-300 mb-8 text-lg">
            Plan smarter.{' '}<span className="font-mono font-bold text-lg bg-stone-100 text-stone-900 px-2 py-1 rounded ml-2">superglobal.travel</span>
          </p>
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-8 py-4 rounded-xl font-semibold text-lg transition-colors"
          >
            Embark... <ArrowRight size={20} />
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
