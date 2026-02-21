/**
 * Level Detector — infers user DeFi knowledge level from message vocabulary.
 * Profile level always takes precedence over vocabulary detection.
 */

export type UserLevel = 'newbie' | 'intermediate' | 'advanced';

const NEWBIE_TERMS = [
  'what is', 'how do i', 'explain', 'safe', 'easy', 'beginner',
  'simple', 'for me', 'i am new', 'i\'m new', 'new to',
];

const ADVANCED_TERMS = [
  'delta neutral', 'leverage loop', 'il hedge', 'pt token', 'basis trade',
  'perp funding', 'flash loan', 'cdp ratio', 'utilization rate',
  'reward epoch', 'i know defi', 'implied apy', 'yt token', 'loop leverage',
];

export function detectUserLevel(message: string, profileLevel?: string): UserLevel {
  if (profileLevel && ['newbie', 'intermediate', 'advanced'].includes(profileLevel)) {
    return profileLevel as UserLevel;
  }
  const lc = message.toLowerCase();
  const advCount = ADVANCED_TERMS.filter((t) => lc.includes(t)).length;
  const begCount = NEWBIE_TERMS.filter((t) => lc.includes(t)).length;
  if (advCount >= 2 || lc.includes('advanced')) return 'advanced';
  if (begCount >= 2 && advCount === 0) return 'newbie';
  return 'intermediate';
}
