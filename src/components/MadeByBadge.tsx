import React from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { cn } from '../lib/utils';

interface MadeByBadgeProps {
  className?: string;
  variant?: 'footer' | 'sidebar';
}

export function MadeByBadge({ className, variant = 'footer' }: MadeByBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className={cn(
        "flex items-center justify-center gap-1.5 text-slate-400/60 hover:text-slate-300 transition-colors duration-300 group cursor-default",
        variant === 'footer' ? "py-8 text-sm border-t border-white/10 w-full" : "py-4 text-xs mt-auto",
        className
      )}
    >
      <span className="font-medium tracking-wide">Made with</span>
      <motion.div
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <Heart className="w-3.5 h-3.5 text-indigo-500/70 group-hover:text-indigo-400 fill-indigo-500/20 group-hover:fill-indigo-400/40 transition-all duration-300" />
      </motion.div>
      <span className="font-medium tracking-wide">by</span>
      <span className="font-semibold text-slate-300/80 group-hover:text-white group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all duration-300">
        Sethi Sahib
      </span>
    </motion.div>
  );
}
