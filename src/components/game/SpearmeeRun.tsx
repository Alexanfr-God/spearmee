import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

import { haptic } from "@/lib/telegram";
import { Button } from "@/components/ui/button";

type Kind = "virus" | "dna" | "speed" | "shield" | "magnet";

interface Entity {
  lane: number;
  z: number;
  kind: Kind;
  hit: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface GameState {
  lane: number;
  laneAnim: number;
  entities: Entity[];
  particles: Particle[];
  lives: number;
  score: number;
  combo: number;
  bestCombo: number;
  distance: number;
  level: number;
  spawnT: number;
  shieldUntil: number;
  speedUntil: number;
  magnetUntil: number;
  invulnUntil: number;
  tailPhase: number;
  time: number;
  status: "playing" | "over";
  w: number;
  h: number;
}

const LANES = 3;
const SPERM_Z = 0.07;

function freshState(): GameState {
  return {
    lane: 1,
    laneAnim: 1,
    entities: [],
    particles: [],
    lives: 3,
    score: 0,
    combo: 0,
    bestCombo: 0,
    distance: 0,
    level: 1,
    spawnT: 0.5,
    shieldUntil: 0,
    speedUntil: 0,
    magnetUntil: 0,
    invulnUntil: 0,
    tailPhase: 0,
    time: 0,
    status: "playing",
    w: 0,
    h: 0,
  };
}

export function SpearmeeRun({
  onExit,
  onGameOver,
}: {
  onExit: () => void;
  onGameOver?: (score: number, level: number) => void;
}) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef<GameState>(freshState());
  const [over, setOver] = useState<{ score: number; level: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    const dpr = Math.min(2, window.devicePixelRatio || 1);

    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      stateRef.current.w = w;
      stateRef.current.h = h;
    };
    resize();
    window.addEventListener("resize", resize);

    const project = (lane: number, z: number, w: number, h: number) => {
      const horizonY = h * 0.2;
      const bottomY = h * 0.84;
      const y = bottomY + z * (horizonY - bottomY);
      const scale = 1 - z * 0.8;
      const gap = w * 0.26;
      const x = w / 2 + (lane - 1) * gap * scale;
      return { x, y, scale };
    };

    const burst = (s: GameState, lane: number, z: number, color: string) => {
      const { x, y } = project(lane, z, s.w, s.h);
      for (let i = 0; i < 12; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 160;
        s.particles.push({
          x,
          y,
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          life: 0.4 + Math.random() * 0.4,
          color,
        });
      }
    };

    const spawn = (s: GameState) => {
      const safe = Math.floor(Math.random() * LANES);
      const count = 1 + (Math.random() < 0.5 ? 1 : 0);
      const used = new Set<number>();
      for (let i = 0; i < count; i++) {
        const lane = Math.floor(Math.random() * LANES);
        if (used.has(lane)) continue;
        used.add(lane);
        let kind: Kind;
        if (lane === safe) {
          const r = Math.random();
          kind = r < 0.1 ? "speed" : r < 0.18 ? "shield" : r < 0.23 ? "magnet" : "dna";
        } else {
          kind = Math.random() < 0.62 ? "virus" : "dna";
        }
        s.entities.push({ lane, z: 1, kind, hit: false });
      }
    };

    const endGame = (s: GameState) => {
      s.status = "over";
      haptic("error");
      setOver({ score: Math.floor(s.score), level: s.level });
      onGameOver?.(Math.floor(s.score), s.level);
    };

    const update = (s: GameState, dt: number) => {
      if (s.status !== "playing") return;
      s.time += dt;
      s.tailPhase += dt * 9;

      const boost = s.speedUntil > s.time ? 1.5 : 1;
      const baseSpeed = (0.42 + s.level * 0.05) * boost;

      for (const e of s.entities) e.z -= baseSpeed * dt;

      s.distance += baseSpeed * dt * 0.05;
      if (s.distance >= 1) {
        s.distance = 0;
        s.level += 1;
        haptic("success");
        s.score += 100;
      }

      s.laneAnim += (s.lane - s.laneAnim) * Math.min(1, dt * 14);

      s.spawnT -= dt;
      if (s.spawnT <= 0) {
        spawn(s);
        s.spawnT = Math.max(0.4, 1.05 - s.level * 0.045);
      }

      const magnet = s.magnetUntil > s.time;
      for (const e of s.entities) {
        if (e.hit) continue;
        const near = e.z <= SPERM_Z && e.z > SPERM_Z - 0.14;
        const sameLane = e.lane === Math.round(s.laneAnim);
        const collect = e.kind !== "virus" && (sameLane || (magnet && e.z <= SPERM_Z + 0.05));
        if (near && e.kind === "virus" && sameLane) {
          e.hit = true;
          if (s.shieldUntil > s.time || s.invulnUntil > s.time) {
            burst(s, e.lane, e.z, "#9b8cff");
          } else {
            s.lives -= 1;
            s.combo = 0;
            s.invulnUntil = s.time + 1.2;
            haptic("error");
            burst(s, e.lane, e.z, "#ff4d6d");
            if (s.lives <= 0) endGame(s);
          }
        } else if (collect && e.z <= SPERM_Z + 0.02) {
          e.hit = true;
          if (e.kind === "dna") {
            s.combo += 1;
            s.bestCombo = Math.max(s.bestCombo, s.combo);
            s.score += 10 * (1 + Math.floor(s.combo / 5));
            haptic("light");
            burst(s, e.lane, e.z, "#56d6ff");
          } else if (e.kind === "speed") {
            s.speedUntil = s.time + 5;
            haptic("medium");
            burst(s, e.lane, e.z, "#ff7ae0");
          } else if (e.kind === "shield") {
            s.shieldUntil = s.time + 4;
            haptic("medium");
            burst(s, e.lane, e.z, "#7affc0");
          } else if (e.kind === "magnet") {
            s.magnetUntil = s.time + 5;
            haptic("medium");
            burst(s, e.lane, e.z, "#ffd24d");
          }
        }
      }
      s.entities = s.entities.filter((e) => e.z > -0.06 && !e.hit);

      for (const p of s.particles) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 320 * dt;
        p.life -= dt;
      }
      s.particles = s.particles.filter((p) => p.life > 0);

      s.score += dt * 6 * boost;
    };

    const draw = (s: GameState) => {
      const { w, h } = s;
      const bg = ctx.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#1a0b3a");
      bg.addColorStop(0.5, "#0c0726");
      bg.addColorStop(1, "#04040f");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      const egg = project(1, 1, w, h);
      const eggR = w * 0.16;
      const grad = ctx.createRadialGradient(egg.x, egg.y, 2, egg.x, egg.y, eggR);
      grad.addColorStop(0, "#ffd76a");
      grad.addColorStop(0.5, "#ff7a59");
      grad.addColorStop(1, "rgba(255,80,80,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(egg.x, egg.y, eggR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "rgba(120,150,255,0.35)";
      ctx.lineWidth = 1.5;
      for (let l = 0; l <= LANES; l++) {
        const far = project(l - 0.5, 1, w, h);
        const near = project(l - 0.5, 0, w, h);
        ctx.beginPath();
        ctx.moveTo(far.x, far.y);
        ctx.lineTo(near.x, near.y);
        ctx.stroke();
      }
      ctx.strokeStyle = "rgba(90,120,220,0.18)";
      for (let i = 1; i <= 8; i++) {
        const z = i / 8;
        const a = project(-0.5, z, w, h);
        const b = project(LANES - 0.5, z, w, h);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      const sorted = [...s.entities].sort((a, b) => b.z - a.z);
      for (const e of sorted) {
        const p = project(e.lane, e.z, w, h);
        const r = w * 0.07 * p.scale;
        if (e.kind === "virus") {
          drawGlow(ctx, p.x, p.y, r, "#ff4d6d");
          ctx.fillStyle = "#ff4d6d";
          spikes(ctx, p.x, p.y, r);
        } else if (e.kind === "dna") {
          drawGlow(ctx, p.x, p.y, r * 0.55, "#56d6ff");
          ctx.fillStyle = "#aef0ff";
          dot(ctx, p.x, p.y, r * 0.5);
        } else {
          const c = e.kind === "speed" ? "#ff7ae0" : e.kind === "shield" ? "#7affc0" : "#ffd24d";
          drawGlow(ctx, p.x, p.y, r * 0.85, c);
          ctx.fillStyle = c;
          dot(ctx, p.x, p.y, r * 0.7);
          ctx.fillStyle = "#0c0726";
          ctx.font = `bold ${Math.max(8, r * 0.7)}px system-ui`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(e.kind === "speed" ? "⚡" : e.kind === "shield" ? "🛡" : "🧲", p.x, p.y);
        }
      }

      const sp = project(s.laneAnim, SPERM_Z, w, h);
      const shielded = s.shieldUntil > s.time;
      const blink = s.invulnUntil > s.time && Math.floor(s.time * 12) % 2 === 0;
      if (!blink) {
        ctx.save();
        ctx.strokeStyle = "rgba(120,200,255,0.95)";
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.shadowColor = "#56b8ff";
        ctx.shadowBlur = 16;
        ctx.beginPath();
        for (let i = 0; i <= 16; i++) {
          const ty = sp.y + i * 7;
          const tx = sp.x + Math.sin(s.tailPhase - i * 0.5) * (10 - i * 0.3);
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        ctx.shadowBlur = 22;
        ctx.fillStyle = shielded ? "#7affc0" : "#dff1ff";
        ctx.beginPath();
        ctx.ellipse(sp.x, sp.y, 13, 17, 0, 0, Math.PI * 2);
        ctx.fill();
        if (shielded) {
          ctx.strokeStyle = "rgba(122,255,192,0.8)";
          ctx.lineWidth = 2.5;
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(sp.x, sp.y, 24, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      for (const p of s.particles) {
        ctx.globalAlpha = Math.max(0, p.life * 2);
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;

      drawHud(ctx, s, w);
    };

    const loop = (now: number) => {
      const s = stateRef.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      update(s, dt);
      draw(s);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const tap = (clientX: number) => {
      const s = stateRef.current;
      if (s.status !== "playing") return;
      const left = clientX < canvas.getBoundingClientRect().left + s.w / 2;
      s.lane = Math.max(0, Math.min(LANES - 1, s.lane + (left ? -1 : 1)));
      haptic("selection");
    };
    const onPointer = (e: PointerEvent) => tap(e.clientX);
    const onKey = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (s.status !== "playing") return;
      if (e.key === "ArrowLeft") s.lane = Math.max(0, s.lane - 1);
      if (e.key === "ArrowRight") s.lane = Math.min(LANES - 1, s.lane + 1);
    };
    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [onGameOver]);

  const playAgain = () => {
    stateRef.current = freshState();
    stateRef.current.w = canvasRef.current?.clientWidth ?? 0;
    stateRef.current.h = canvasRef.current?.clientHeight ?? 0;
    setOver(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#04040f]">
      <canvas ref={canvasRef} className="h-full w-full touch-none select-none" />
      <button
        onClick={onExit}
        aria-label={t("common.close")}
        className="absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))] rounded-full bg-black/40 p-2 text-white backdrop-blur"
      >
        <X className="h-5 w-5" />
      </button>

      {over && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 px-8">
          <div className="w-full max-w-[320px] rounded-3xl bg-card p-6 text-center shadow-[var(--shadow-card)]">
            <p className="text-sm font-medium text-muted-foreground">{t("game.over")}</p>
            <p className="mt-1 text-4xl font-bold tabular-nums text-foreground">{over.score}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("game.reached", { level: over.level })}
            </p>
            <div className="mt-5 space-y-2">
              <Button className="w-full" size="lg" onClick={playAgain}>
                {t("game.again")}
              </Button>
              <Button className="w-full" variant="ghost" onClick={onExit}>
                {t("game.exit")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function drawGlow(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.8);
  g.addColorStop(0, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function dot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function spikes(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.62;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function drawHud(ctx: CanvasRenderingContext2D, s: GameState, w: number) {
  ctx.save();
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = "#dff1ff";
  ctx.font = "bold 22px system-ui";
  ctx.fillText(`${Math.floor(s.score)}`, 16, 16);
  ctx.font = "600 12px system-ui";
  ctx.fillStyle = "#9bb6ff";
  ctx.fillText(`LVL ${s.level}`, 16, 44);
  if (s.combo > 1) {
    ctx.fillStyle = "#ff7ae0";
    ctx.fillText(`COMBO x${s.combo}`, 16, 60);
  }
  ctx.textAlign = "right";
  ctx.font = "18px system-ui";
  ctx.fillText("❤️".repeat(Math.max(0, s.lives)), w - 14, 16);
  const bw = w * 0.5;
  const bx = (w - bw) / 2;
  ctx.fillStyle = "rgba(255,255,255,0.15)";
  ctx.fillRect(bx, 22, bw, 6);
  ctx.fillStyle = "#56d6ff";
  ctx.fillRect(bx, 22, bw * s.distance, 6);
  ctx.restore();
}
