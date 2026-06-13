import type { Transition, Variants } from 'framer-motion';

const smoothEase = [0.22, 1, 0.36, 1] as const;
const softEase = [0.4, 0, 0.2, 1] as const;

export const pageTransition: Transition = {
  duration: 0.28,
  ease: smoothEase,
};

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0, transition: pageTransition },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18, ease: softEase } },
};

export const contentSwitchVariants: Variants = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.26, ease: smoothEase },
  },
  exit: {
    opacity: 0,
    y: -14,
    scale: 0.99,
    transition: { duration: 0.18, ease: softEase },
  },
};

export const revealContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.035,
    },
  },
};

export const revealItemVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: smoothEase },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: { duration: 0.16, ease: softEase },
  },
};

export const alertVariants: Variants = {
  initial: { opacity: 0, y: -8, height: 0 },
  animate: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: { duration: 0.22, ease: smoothEase },
  },
  exit: {
    opacity: 0,
    y: -8,
    height: 0,
    transition: { duration: 0.16, ease: softEase },
  },
};

export const modalOverlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.18, ease: softEase } },
  exit: { opacity: 0, transition: { duration: 0.16, ease: softEase } },
};

export const modalPanelVariants: Variants = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring', damping: 28, stiffness: 360 },
  },
  exit: {
    opacity: 0,
    y: 18,
    scale: 0.97,
    transition: { duration: 0.16, ease: softEase },
  },
};
