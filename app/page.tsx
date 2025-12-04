"use client";

import ChatInterface from './components/ChatInterface';
import { ProfileProvider } from './context/ProfileContext';
import { ChatsProvider } from './context/ChatsContext';

export default function Home() {
  return (
    <ProfileProvider>
      <ChatsProvider>
        <main className="flex min-h-screen flex-col items-center justify-between px-2 py-2 bg-stone-900 text-stone-100">
          <div className="z-10 max-w-[1600px] w-full items-center justify-between font-mono text-sm lg:flex">
            <p className="fixed left-0 top-0 flex w-full justify-center border-b border-stone-800 bg-stone-900/90 pb-4 pt-4 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-stone-800/50 lg:p-3">
              The Broke Backpacker AI
            </p>
            <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-stone-900 via-stone-900/90 lg:static lg:h-auto lg:w-auto lg:bg-none">
              <a
                className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
                href="https://www.thebrokebackpacker.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                By The Broke Backpacker
              </a>
            </div>
          </div>

          <div className="relative flex place-items-center w-full max-w-[1600px] flex-1">
            <ChatInterface />
          </div>
        </main>
      </ChatsProvider>
    </ProfileProvider>
  );
}
