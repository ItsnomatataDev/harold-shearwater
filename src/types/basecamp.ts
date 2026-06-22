export type Accent = 'orange' | 'blue' | 'gold' | 'green' | 'brown'

export interface ScheduleItem { id: string; time: string; title: string; meta: string; accent: Accent; icon: 'sun' | 'users' | 'route' }
export interface Duty { id: string; title: string; context: string; due: string; completed: boolean }
export interface Meeting { id: string; time: string; title: string; location: string; attendees: { initials: string; color: string }[] }
export interface Announcement { id: string; label: string; title: string; body: string; author: string; time: string; accent: Accent }
export interface QuickAction { id: string; label: string; href: string; icon: 'plus' | 'calendar' | 'megaphone' | 'file'; accent: Accent }
