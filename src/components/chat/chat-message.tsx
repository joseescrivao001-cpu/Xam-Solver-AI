'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BrainCircuit } from 'lucide-react';
import Image from 'next/image';
import { SafeMarkdown } from './safe-markdown';
import { SolutionProcess } from './solution-process';
import { Loader2 } from 'lucide-react';

export interface ChatMessageData {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  thought_process?: string;
  is_thinking?: boolean;
  image_url?: string;
}

interface ChatMessageProps {
  msg: ChatMessageData;
  isStreaming: boolean;
  isLastMessage: boolean;
  onImageClick?: (imageUrl: string, id: string) => void;
}

/**
 * ChatMessage — Proprietary Enterprise Design System Component
 * 
 * User bubble: Glassmorphism Zinc, rounded pill.
 * AI response: Borderless, clean typography with collapsible thought process.
 * Streaming: Blinking cursor injected via SafeMarkdown.
 * Framer Motion: Spring physics on entry.
 */
export function ChatMessage({ msg, isStreaming, isLastMessage, onImageClick }: ChatMessageProps) {
  const isAI = msg.role === 'ai';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 280, damping: 22 }}
      className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
    >
      {/* AI Avatar */}
      {isAI && (
        <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 mt-1 ring-2 ring-indigo-500/10">
          <BrainCircuit className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Message Container */}
      <div className={`flex flex-col gap-2 ${isAI ? 'flex-1 max-w-[90%] md:max-w-[82%]' : 'items-end'}`}>

        {/* Image Preview */}
        {msg.image_url && (
          <div
            className="mb-1 cursor-pointer group"
            onClick={() => onImageClick?.(msg.image_url!, msg.id)}
          >
            <Image
              src={msg.image_url}
              alt="Uploaded"
              width={400}
              height={400}
              unoptimized
              className="max-w-xs w-full h-auto rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-700 group-hover:opacity-90 transition-opacity"
            />
          </div>
        )}

        {/* Content */}
        {msg.is_thinking ? (
          /* Skeleton Shimmer — Cognition in progress */
          <div className="flex flex-col gap-3 py-2 max-w-lg w-full">
            <div className="flex items-center gap-2.5 mb-1">
              <Loader2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 animate-spin" />
              <span className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 tracking-widest uppercase">
                Cognição em processo
              </span>
            </div>
            <div className="h-3.5 w-3/4 rounded-full skeleton-shimmer" />
            <div className="h-3.5 w-full rounded-full skeleton-shimmer" />
            <div className="h-3.5 w-5/6 rounded-full skeleton-shimmer" />
            <div className="h-3.5 w-2/3 rounded-full skeleton-shimmer" />
          </div>
        ) : msg.content === '' && isStreaming && isLastMessage ? (
          /* Initial pulse before first token */
          <div className="flex items-center gap-1.5 py-3 pl-1">
            <span className="w-1.5 h-5 rounded-sm bg-indigo-500/60 animate-pulse" />
          </div>
        ) : isAI ? (
          /* AI Response — clean, no border */
          <div className="flex flex-col gap-1 w-full">
            <SolutionProcess thoughts={msg.thought_process || ''} />
            <SafeMarkdown
              content={msg.content}
              isAiRole
              isStreaming={isStreaming && isLastMessage}
            />
          </div>
        ) : (
          /* User Bubble — Ultra minimal pill */
          <div className="
            w-fit max-w-[min(85vw,520px)]
            bg-zinc-100 dark:bg-[#1A1A1A]
            text-zinc-900 dark:text-zinc-200
            px-5 py-3.5
            rounded-3xl rounded-tr-sm
            shadow-sm
            text-[15px] leading-relaxed
          ">
            {msg.content}
          </div>
        )}
      </div>
    </motion.div>
  );
}
