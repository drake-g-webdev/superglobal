"use client";

import Link from 'next/link';
import { Globe, ArrowLeft, Video, MessageCircle, Users, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

declare global {
  interface Window {
    Cal?: (action: string, ...args: unknown[]) => void;
  }
}

export default function BetaPage() {
  const [calLoaded, setCalLoaded] = useState(false);

  useEffect(() => {
    // Load Cal.com embed script
    const script = document.createElement('script');
    script.src = 'https://app.cal.com/embed/embed.js';
    script.async = true;

    script.onload = () => {
      // Initialize Cal.com inline embed
      if (window.Cal) {
        window.Cal("inline", {
          elementOrSelector: "#cal-embed",
          calLink: "drake-superglobal/onboarding-jam",
          config: {
            theme: "dark",
          }
        });
        setCalLoaded(true);
      }
    };

    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector('script[src="https://app.cal.com/embed/embed.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-stone-900 text-stone-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2 font-mono text-stone-300 hover:text-white transition-colors">
          <ArrowLeft size={20} />
          <Globe size={24} className="text-orange-500" />
          <span className="font-semibold text-lg">superglobal.travel</span>
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-stone-900 to-stone-900" />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-600/20 border border-orange-500/30 rounded-full px-4 py-2 mb-6">
            <Sparkles size={16} className="text-orange-400" />
            <span className="text-orange-300 text-sm font-medium">Limited Beta Access</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Join the <span className="text-orange-500">Superglobal Beta</span>
          </h1>
          <p className="text-xl text-stone-300 mb-8 max-w-2xl mx-auto">
            We&apos;re looking for travelers to help shape the future of trip planning.
            Book a quick WhatsApp video call to get early access and share your feedback.
          </p>
        </div>
      </div>

      {/* What to Expect */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Video className="text-orange-500" size={24} />
            </div>
            <h3 className="font-semibold mb-2">15-min Video Call</h3>
            <p className="text-stone-400 text-sm">
              Quick intro via WhatsApp to discuss your travel style and needs
            </p>
          </div>

          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <Users className="text-orange-500" size={24} />
            </div>
            <h3 className="font-semibold mb-2">Early Access</h3>
            <p className="text-stone-400 text-sm">
              Be among the first to use Superglobal and influence its development
            </p>
          </div>

          <div className="bg-stone-800/50 border border-stone-700 rounded-xl p-5 text-center">
            <div className="w-12 h-12 bg-orange-600/20 rounded-lg flex items-center justify-center mb-4 mx-auto">
              <MessageCircle className="text-orange-500" size={24} />
            </div>
            <h3 className="font-semibold mb-2">Direct Feedback</h3>
            <p className="text-stone-400 text-sm">
              Your input directly shapes new features and improvements
            </p>
          </div>
        </div>

        {/* Cal.com Embed */}
        <div className="bg-stone-800/30 border border-stone-700 rounded-xl p-6 md:p-8">
          <h2 className="text-2xl font-bold text-center mb-6">Schedule Your Call</h2>

          {/* Cal.com inline embed */}
          <div id="cal-embed" className="w-full min-h-[600px] relative">
            {!calLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-stone-400">Loading scheduler...</div>
              </div>
            )}
          </div>

          <p className="text-center text-stone-500 text-sm mt-6">
            Powered by Cal.com - We&apos;ll send a confirmation to your email
          </p>
        </div>

        {/* Alternative: Manual form if Cal.com isn't set up yet */}
        <div className="mt-8 text-center text-stone-400">
          <p className="text-sm">
            Having trouble with the scheduler?{' '}
            <a
              href="mailto:drake@superglobal.travel?subject=Beta Tester Interest&body=Hi! I'm interested in becoming a beta tester for Superglobal.%0A%0AMy name: %0AMy WhatsApp number: %0APreferred time: %0ANotes: "
              className="text-orange-400 hover:text-orange-300 underline"
            >
              Email us directly
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-6 py-8 text-center text-stone-500 text-sm border-t border-stone-800 mt-12">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Globe size={16} className="text-orange-500" />
          <span className="font-mono">superglobal.travel</span>
        </div>
        <p>&copy; 2025 Superglobal. Happy travels!</p>
      </footer>
    </div>
  );
}
