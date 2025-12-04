"use client";

import { Plus, MessageSquare, Trash2, Plane } from 'lucide-react';
import { useChats } from '../context/ChatsContext';
import { useTranslations, useLocale } from '../context/LocaleContext';
import clsx from 'clsx';

export default function ChatSidebar() {
  const { chats, activeChatId, createChat, deleteChat, setActiveChat } = useChats();
  const t = useTranslations('sidebar');
  const tCommon = useTranslations('common');
  const { locale } = useLocale();

  const handleNewChat = () => {
    createChat();
  };

  const handleDeleteChat = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (confirm(t('deleteTrip'))) {
      deleteChat(chatId);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return tCommon('today');
    if (diffDays === 1) return tCommon('yesterday');
    if (diffDays < 7) {
      const template = tCommon('daysAgo');
      return template.replace('{days}', String(diffDays));
    }
    return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US');
  };

  return (
    <div className="w-56 bg-stone-900 flex flex-col border-r border-stone-700 hidden md:flex">
      {/* Header */}
      <div className="p-4 border-b border-stone-800">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          {t('newTrip')}
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto py-2">
        <div className="px-3 py-2">
          <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">{t('yourTrips')}</h3>
        </div>

        {chats.map(chat => (
          <div
            key={chat.id}
            onClick={() => setActiveChat(chat.id)}
            className={clsx(
              "group mx-2 mb-1 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
              chat.id === activeChatId
                ? "bg-stone-800 border border-stone-700"
                : "hover:bg-stone-800/50"
            )}
          >
            <div className="flex items-start gap-2">
              <Plane size={16} className={clsx(
                "mt-0.5 flex-shrink-0",
                chat.id === activeChatId ? "text-orange-500" : "text-stone-500"
              )} />

              <div className="flex-1 min-w-0">
                <p className={clsx(
                  "text-sm font-medium truncate",
                  chat.id === activeChatId ? "text-stone-100" : "text-stone-300"
                )}>
                  {chat.title}
                </p>
                <p className="text-xs text-stone-500 truncate">
                  {chat.destination !== 'General' ? chat.destination : t('noDestination')}
                </p>
              </div>

              <button
                onClick={(e) => handleDeleteChat(e, chat.id)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-stone-700 rounded transition-all"
              >
                <Trash2 size={14} className="text-stone-500 hover:text-red-400" />
              </button>
            </div>

            <p className="text-xs text-stone-600 mt-1 pl-6">
              {formatDate(chat.updatedAt)}
            </p>
          </div>
        ))}

        {chats.length === 0 && (
          <div className="px-4 py-8 text-center">
            <MessageSquare size={24} className="mx-auto text-stone-600 mb-2" />
            <p className="text-sm text-stone-500">{t('noTrips')}</p>
          </div>
        )}
      </div>
    </div>
  );
}
