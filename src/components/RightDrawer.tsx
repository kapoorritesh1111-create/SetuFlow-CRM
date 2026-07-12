'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';

export interface RightDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  widthClassName?: string