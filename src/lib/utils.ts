import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatInitials(value: string): string {
  const lettersOnly = value.replace(/[^a-zA-Z]/g, '');
  const upperCase = lettersOnly.toUpperCase();
  const limited = upperCase.slice(0, 5);
  return limited.split('').join('.');
}
