import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import logoImg from "../assets/logo.png";
import "./Splash.css";

export default function Splash() {
  const nav = useNavigate();
  const rootRef = useRef(null);
  const [exiting, setExiting] = useState(false);

  // Respect user OS "Reduce motion"
  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Timings (seconds)
  const TIMING = prefersReduced
    ? {
        delayStart: 0.0,
        roll: 0.3,
        letterStagger: 0.0,
        letterDur: 0.0,
        hold: 0.2,
        fade: 0.3,
      }
    : {
        delayStart: 0.15,
        roll: 1.1,           // roll-in duration
        letterStagger: 0.06, // per-letter stagger
        letterDur: 0.40,     // per-letter anim duration
        hold: 0.50,          // pause after reveal
        fade: 0.60,          // fade-out duration
      };

  const word = "Sportrium";
  const letters = useMemo(() => word.split(""), []);

  // Compute when to start exit + navigate after fade
  useEffect(() => {
    const exitStart =
      TIMING.delayStart +
      TIMING.roll +
      (letters.length - 1) * TIMING.letterStagger +
      TIMING.letterDur +
      TIMING.hold;

    const t1 = setTimeout(() => setExiting(true), exitStart * 1000);
    const t2 = setTimeout(() => nav("/"), (exitStart + TIMING.fade) * 1000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav]);

  return (
    <div ref={rootRef} className={`page-splash ${exiting ? "exit" : ""}`}>
      {/* Content */}
      <motion.div
        className="splash-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: prefersReduced ? 0 : 0.45, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {/* Logo: roll + spin from left, stop at center */}
        <motion.img
          className="logo-ball"
          src={logoImg}
          alt=""
          initial={{ x: "-40vw", rotate: -540 }}
          animate={{ x: 0, rotate: 0 }}
          transition={{
            delay: TIMING.delayStart,
            duration: TIMING.roll,
            ease: [0.22, 1, 0.36, 1],
          }}
        />

        {/* Word reveal from the right, letter by letter, with brand gradient */}
        <motion.h1
          className="brand-title"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: {
              transition: {
                delayChildren: TIMING.delayStart + TIMING.roll + 0.15,
                staggerChildren: TIMING.letterStagger,
              },
            },
          }}
        >
          {letters.map((ch, i) => (
            <motion.span
              key={`${ch}-${i}`}
              className="char"
              variants={{
                hidden: { x: 40, opacity: 0 },
                show: {
                  x: 0,
                  opacity: 1,
                  transition: {
                    duration: TIMING.letterDur,
                    ease: [0.22, 1, 0.36, 1],
                  },
                },
              }}
            >
              {ch}
            </motion.span>
          ))}
        </motion.h1>
      </motion.div>
    </div>
  );
}
