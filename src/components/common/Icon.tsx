import React from 'react';
import * as LucideIcons from 'lucide-react';

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: string;
  className?: string;
}

export const Icon: React.FC<IconProps> = ({ name, className = 'w-5 h-5', ...props }) => {
  const LucideIcon = (LucideIcons as any)[name] || LucideIcons.Vault || LucideIcons.ShieldAlert;
  return <LucideIcon className={className} {...props} />;
};
