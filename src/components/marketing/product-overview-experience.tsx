'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { SiteShell } from '@/components/marketing/site-shell';

type Page = {
  number: number;
  short: string;
  title: string;
  description: string;
  bullets: string[];
  kind: 'hero' | 'journey' | 'workspace' | 'list' | 'phone' | 'timeline' |