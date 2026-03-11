import React from 'react';
import { cn } from '@/utils';

export default function BigoCard({ children, className, ...props }) {
  return (
    <div 
      className={cn(
        'bigo-card p-4 rounded-[1.5rem]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}