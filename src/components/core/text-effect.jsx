/**
 * TextEffect — motion-primitives inspired text animation component.
 * Preset: 'fade-in-blur' (character-by-character or word-by-word reveal with blur)
 *
 * Usage:
 *   <TextEffect preset="fade-in-blur" speedReveal={1.1} speedSegment={0.3}>
 *     Mon titre d'annonce
 *   </TextEffect>
 */
import React, { useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';

// ─── Preset definitions ──────────────────────────────────────────────────────

const PRESETS = {
  'fade-in-blur': {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: 0.025 } },
    },
    segment: {
      hidden: { opacity: 0, filter: 'blur(8px)', y: 6 },
      show:   { opacity: 1, filter: 'blur(0px)', y: 0 },
    },
  },
  'fade-in': {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: 0.03 } },
    },
    segment: {
      hidden: { opacity: 0, y: 8 },
      show:   { opacity: 1, y: 0 },
    },
  },
  'slide-in': {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: 0.04 } },
    },
    segment: {
      hidden: { opacity: 0, x: -16 },
      show:   { opacity: 1, x: 0 },
    },
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * @param {object}  props
 * @param {string}  props.children        - The text to animate.
 * @param {string}  [props.preset]        - Animation preset key (default: 'fade-in-blur').
 * @param {'word'|'char'} [props.per]     - Animate per word or per character (default: 'word').
 * @param {number}  [props.speedReveal]   - Multiplier that reduces stagger delay.
 * @param {number}  [props.speedSegment]  - Duration of each segment transition in seconds.
 * @param {string}  [props.className]     - Extra CSS classes for the wrapper.
 * @param {string}  [props.as]            - HTML element for the wrapper.
 * @param {boolean} [props.once]          - If true, animate only the first time in view.
 * @param {number}  [props.delay]         - Extra initial delay before stagger starts.
 */
export function TextEffect({
  children,
  preset = 'fade-in-blur',
  per = 'word',
  speedReveal = 1,
  speedSegment = 0.35,
  className = '',
  as: Tag = 'span',
  once = true,
  delay = 0,
}) {
  const prefersReducedMotion = useReducedMotion();

  const text = typeof children === 'string' ? children : String(children ?? '');
  const segments = useMemo(() => {
    if (per === 'char') return text.split('');
    return text.split(/(\s+)/);
  }, [text, per]);

  const presetConfig = PRESETS[preset] ?? PRESETS['fade-in-blur'];

  if (prefersReducedMotion) {
    return <Tag className={className}>{children}</Tag>;
  }

  const staggerDelay = (1 / (speedReveal * (per === 'char' ? 1.8 : 1))) * 0.025;

  const containerVariants = {
    hidden: presetConfig.container.hidden,
    show: {
      ...presetConfig.container.show,
      transition: {
        ...(presetConfig.container.show?.transition ?? {}),
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };

  const segmentVariants = {
    hidden: presetConfig.segment.hidden,
    show: {
      ...presetConfig.segment.show,
      transition: {
        duration: speedSegment,
        ease: [0.25, 0.46, 0.45, 0.94],
      },
    },
  };

  const MotionTag = motion[Tag] ?? motion.span;

  return (
    <MotionTag
      className={cn ? cn('inline', className) : `inline ${className}`}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount: 0.2 }}
      aria-label={text}
    >
      {segments.map((segment, i) => {
        if (/^\s+$/.test(segment)) {
          return <span key={i} aria-hidden="true">{segment}</span>;
        }
        return (
          <motion.span
            key={i}
            variants={segmentVariants}
            style={{ display: 'inline-block' }}
            aria-hidden="true"
          >
            {segment}
          </motion.span>
        );
      })}
    </MotionTag>
  );
}

export default TextEffect;
