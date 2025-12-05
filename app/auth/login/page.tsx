"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Lock, Loader2, AlertCircle, Key } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SpinningGlobe from '../../components/SpinningGlobe';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !masterPassword) {
      setError('All fields are required');
      return;
    }

    // Validate master password
    const correctMasterPassword = process.env.NEXT_PUBLIC_MASTER_PASSWORD || 'brokepacker2025';
    if (masterPassword !== correctMasterPassword) {
      setError('Invalid master password');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (!result.ok) {
        setError(result.error || 'Invalid email or password');
        setIsLoading(false);
        return;
      }

      router.push('/app');
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 mb-4">
            <SpinningGlobe size={80} />
          </div>
          <h1 className="text-2xl font-bold text-white font-mono">superglobal.travel</h1>
          <p className="text-stone-400 mt-2">embark</p>
        </div>

        {/* Form */}
        <div className="bg-stone-800 rounded-2xl p-6 border border-stone-700">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-stone-400 uppercase font-bold mb-1">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 uppercase font-bold mb-1">Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-stone-400 uppercase font-bold mb-1">Master Password</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                  <input
                    type="password"
                    value={masterPassword}
                    onChange={(e) => setMasterPassword(e.target.value)}
                    placeholder="App access code"
                    className="w-full bg-stone-700 border border-stone-600 rounded-lg pl-10 pr-4 py-3 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>
                <p className="text-xs text-stone-500 mt-1">Required to access the app</p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-6 bg-orange-600 hover:bg-orange-500 disabled:bg-stone-600 text-white rounded-lg py-3 font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-stone-400 mt-4">
            Don&apos;t have an account?{' '}
            <Link href="/auth/signup" className="text-orange-400 hover:text-orange-300">
              Create one
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-stone-500 mt-6">
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
      </div>
    </div>
  );
}
