import React, { useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineFormula,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring, type Vec2 } from "@/lib/motion";
import { ACCENT, INK, INK_QUIET, INK_STRUCTURE, curveY } from "./turningPoints";
import { getVariableInfo, numberPropsFromDefinition } from "../variables";

const STEP_NAMES = [
    "1. Turning points",
    "2. Asymptotes",
    "3. Sign of dy/dx",
    "4. Points of inflection",
    "5. The finished curve",
];

// ── Geometry ─────────────────────────────────────────────────────────────────

const VIEW_W = 560;
const VIEW_H = 320;
const PLOT_LEFT = 56;
const PLOT_RIGHT = 504;
const AXIS_Y = 170;
const Y_SCALE = 62.5;
const Y_LIMIT = 1.6;
const ROOT_THREE = Math.sqrt(3);

const SKETCH_X = [-3, -1, 0, 1, 3];
const TARGETS = SKETCH_X.map((x) => curveY(x));
const TOLERANCE = 0.18;
const DEFAULT_POINTS = [1.2, 1.2, 0, -1.2, -1.2];

const xFor = (x: number) => PLOT_LEFT + ((x + 3) / 6) * (PLOT_RIGHT - PLOT_LEFT);
const yFor = (y: number) => AXIS_Y - y * Y_SCALE;

const snap = (v: number) => Math.round(v / 0.05) * 0.05;

const truePath = Array.from({ length: 241 }, (_, i) => {
    const x = -3 + (i * 6) / 240;
    return `${i === 0 ? "M" : "L"} ${xFor(x)} ${yFor(curveY(x))}`;
}).join(" ");

/** Catmull-Rom through the student's points, written as cubic beziers. */
const sketchPath = (values: number[]) => {
    const pts = SKETCH_X.map((x, i) => ({ x: xFor(x), y: yFor(values[i] ?? 0) }));
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i += 1) {
        const p0 = pts[Math.max(i - 1, 0)];
        const p1 = pts[i];
        const p2 = pts[i + 1];
        const p3 = pts[Math.min(i + 2, pts.length - 1)];
        const c1x = p1.x + (p2.x - p0.x) / 6;
        const c1y = p1.y + (p2.y - p0.y) / 6;
        const c2x = p2.x - (p3.x - p1.x) / 6;
        const c2y = p2.y - (p3.y - p1.y) / 6;
        d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;
    }
    return d;
};

const svgPointFromEvent = (event: React.PointerEvent, svg: SVGSVGElement | null): Vec2 => {
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
        y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
};

function SketchHandle({
    index,
    value,
    matched,
    svgRef,
}: {
    index: number;
    value: number;
    matched: boolean;
    svgRef: React.RefObject<SVGSVGElement>;
}) {
    const setVar = useSetVar();
    const points = useVar<number[]>("finalSketchPoints", DEFAULT_POINTS);
    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const draggingRef = useRef(false);
    const scale = useSpring(dragging || hovered ? 1.15 : 1, { stiffness: 400, damping: 26 });

    const cx = xFor(SKETCH_X[index]);
    const cy = yFor(value);

    return (
        <>
            <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                <circle
                    r="8"
                    fill={matched ? ACCENT : "#FFFFFF"}
                    stroke={ACCENT}
                    strokeWidth="2.5"
                    filter="url(#final-sketch-shadow)"
                />
            </g>
            <circle
                cx={cx}
                cy={cy}
                r="24"
                fill="transparent"
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    draggingRef.current = true;
                    setDragging(true);
                }}
                onPointerMove={(event) => {
                    if (!draggingRef.current) return;
                    const point = svgPointFromEvent(event, svgRef.current);
                    const next = [...points];
                    next[index] = snap(clamp((AXIS_Y - point.y) / Y_SCALE, -Y_LIMIT, Y_LIMIT));
                    setVar("finalSketchPoints", next);
                }}
                onPointerUp={() => {
                    draggingRef.current = false;
                    setDragging(false);
                }}
                onPointerCancel={() => {
                    draggingRef.current = false;
                    setDragging(false);
                }}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
            />
        </>
    );
}

/** A short slanted arrow showing whether the curve climbs or falls here. */
function DirectionArrow({ cx, cy, rising }: { cx: number; cy: number; rising: boolean }) {
    const dy = rising ? -9 : 9;
    const tipX = cx + 14;
    const tipY = cy + dy;
    const back = rising ? [[tipX - 8, tipY + 1], [tipX - 1, tipY + 8]] : [[tipX - 8, tipY - 1], [tipX - 1, tipY - 8]];
    return (
        <g stroke={INK_STRUCTURE} strokeWidth="2" strokeLinecap="round" fill="none">
            <line x1={cx - 14} y1={cy - dy} x2={tipX} y2={tipY} />
            <polyline points={`${back[0][0]},${back[0][1]} ${tipX},${tipY} ${back[1][0]},${back[1][1]}`} strokeLinejoin="round" />
        </g>
    );
}

function FinalSketchDrawing() {
    const points = useVar<number[]>("finalSketchPoints", DEFAULT_POINTS);
    const step = useVar<number>("finalSketchStep", 1);
    const svgRef = useRef<SVGSVGElement>(null);

    const matches = SKETCH_X.map((_, i) => Math.abs((points[i] ?? 0) - TARGETS[i]) <= TOLERANCE);
    const matchedCount = matches.filter(Boolean).length;
    const complete = matchedCount === SKETCH_X.length;

    const inflectionX = [-ROOT_THREE, 0, ROOT_THREE];

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full select-none"
            role="img"
            aria-label="Axes marked with the turning points, points of inflection and horizontal asymptote, and five draggable points to shape the final curve"
        >
            <defs>
                <filter id="final-sketch-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g fontSize="12" style={{ fontVariantNumeric: "tabular-nums" }}>
                <text x="24" y="34" fill={INK}>{`${matchedCount} of 5 points in place`}</text>
                {complete ? (
                    <text x={VIEW_W - 24} y="34" fill={ACCENT} textAnchor="end">
                        that is the curve
                    </text>
                ) : step >= 5 ? (
                    <text x={VIEW_W - 24} y="34" fill={ACCENT} textAnchor="end">
                        compare with the glow
                    </text>
                ) : null}
            </g>

            {/* Step 2 — the horizontal asymptote. */}
            <line
                x1={PLOT_LEFT}
                y1={AXIS_Y}
                x2={PLOT_RIGHT}
                y2={AXIS_Y}
                stroke={INK_QUIET}
                strokeWidth="1.5"
                strokeDasharray="5 5"
            />
            {step >= 2 && (
                <text x={PLOT_RIGHT} y={AXIS_Y + 18} fill={INK} fontSize="11" textAnchor="end">
                    y = 0
                </text>
            )}
            <line x1={xFor(0)} y1={70} x2={xFor(0)} y2={276} stroke={INK_QUIET} strokeWidth="1.5" />

            {/* Step 4 — the points of inflection. */}
            <g opacity={step >= 4 ? 1 : 0} style={{ transition: "opacity 200ms ease" }}>
                {inflectionX.map((x, i) => (
                    <g key={`inflection-${i}`}>
                        <rect
                            x={xFor(x) - 5}
                            y={yFor(curveY(x)) - 5}
                            width="10"
                            height="10"
                            transform={`rotate(45 ${xFor(x)} ${yFor(curveY(x))})`}
                            fill="#FFFFFF"
                            stroke={INK_STRUCTURE}
                            strokeWidth="2"
                        />
                        <line x1={xFor(x)} y1={AXIS_Y - 5} x2={xFor(x)} y2={AXIS_Y + 5} stroke={INK_STRUCTURE} strokeWidth="1.5" />
                        <text x={xFor(x)} y={292} fill={INK} fontSize="11" textAnchor="middle">
                            {i === 0 ? "−√3" : i === 1 ? "0" : "√3"}
                        </text>
                    </g>
                ))}
            </g>

            {/* Step 1 — the turning points. */}
            <g>
                <circle cx={xFor(1)} cy={yFor(1)} r="8" fill="none" stroke={INK_STRUCTURE} strokeWidth="2" />
                <text x={xFor(1) + 14} y={yFor(1) - 12} fill={INK} fontSize="11" textAnchor="start">
                    (1, 1)
                </text>
                <circle cx={xFor(-1)} cy={yFor(-1)} r="8" fill="none" stroke={INK_STRUCTURE} strokeWidth="2" />
                <text x={xFor(-1) - 14} y={yFor(-1) + 20} fill={INK} fontSize="11" textAnchor="end">
                    {"(−1, −1)"}
                </text>
            </g>

            {/* Step 3 — where the curve climbs and where it falls. */}
            {step >= 3 && (
                <g>
                    <DirectionArrow cx={xFor(-2.2)} cy={100} rising={false} />
                    <DirectionArrow cx={xFor(0.45)} cy={100} rising />
                    <DirectionArrow cx={xFor(2.4)} cy={230} rising={false} />
                </g>
            )}

            {/* Step 5 — the finished curve, glowing behind the student's sketch. */}
            {(complete || step >= 5) && (
                <path d={truePath} fill="none" stroke={ACCENT} strokeWidth="9" opacity={0.28} strokeLinecap="round" />
            )}
            <path
                d={sketchPath(points)}
                fill="none"
                stroke={ACCENT}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {SKETCH_X.map((_, i) => (
                <SketchHandle key={`handle-${i}`} index={i} value={points[i] ?? 0} matched={matches[i]} svgRef={svgRef} />
            ))}
        </svg>
    );
}

function FinalSketchFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="final-sketch-figure"
            onReset={() => {
                setVar("finalSketchPoints", [...DEFAULT_POINTS]);
                setVar("finalSketchStep", 1);
            }}
            caption="Walk the slider through the five steps. Each one adds what it found, and the last one reveals the finished curve behind your own sketch."
        >
            <FinalSketchDrawing />
            <div className="px-6 pb-5">
                <FigureSlider
                    varName="finalSketchStep"
                    label="Step"
                    {...numberPropsFromDefinition(getVariableInfo("finalSketchStep"))}
                    formatValue={(v) => STEP_NAMES[Math.round(v) - 1] ?? ""}
                />
            </div>
            <InteractionHintSequence
                hintKey="final-sketch-drag"
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag each teal point onto the shape the clues demand",
                        position: { x: "63%", y: "42%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: 16 }, endOffset: { x: 0, y: -22 } },
                    },
                ]}
            />
        </Figure>
    );
}

export const graphSketchConclusionBlocks: ReactElement[] = [
    <StackLayout key="layout-sketch-conclusion-heading" maxWidth="xl">
        <Block id="sketch-conclusion-heading" padding="md">
            <EditableH2 id="h2-sketch-conclusion-heading" blockId="sketch-conclusion-heading">
                The Complete Curve Sketch
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-conclusion-routine" maxWidth="xl">
        <Block id="sketch-conclusion-routine" padding="sm">
            <EditableParagraph id="para-sketch-conclusion-routine" blockId="sketch-conclusion-routine">
                A sketch is never a guess. Differentiate and factorise; set the numerator of
                {" "}<InlineFormula latex="\frac{dy}{dx}" colorMap={{}} /> to zero for the stationary points
                and its denominator to zero for the vertical asymptotes; build a sign table for every
                interval in between; then repeat that sign test on{" "}
                <InlineFormula latex="\frac{d^2y}{dx^2}" colorMap={{}} /> to locate the points of
                inflection.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-conclusion-invite" maxWidth="xl">
        <Block id="sketch-conclusion-invite" padding="sm">
            <EditableParagraph id="para-sketch-conclusion-invite" blockId="sketch-conclusion-invite">
                Now put the whole method to work. Step the slider through all five stages below, and as
                each clue lands, drag the five teal points until the curve obeys every one of them.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-conclusion-figure" maxWidth="xl">
        <Block id="sketch-conclusion-assembly" padding="sm" hasVisualization>
            <FinalSketchFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-conclusion-payoff" maxWidth="xl">
        <Block id="sketch-conclusion-payoff" padding="sm">
            <EditableParagraph id="para-sketch-conclusion-payoff" blockId="sketch-conclusion-payoff">
                The curve you built, <InlineFormula latex="y = \frac{2x}{1+x^2}" colorMap={{}} />, is
                decreasing on both outer intervals, increasing between{" "}
                <InlineFormula latex="(-1, -1)" colorMap={{}} /> and{" "}
                <InlineFormula latex="(1, 1)" colorMap={{}} />, and changes concavity three times. Not one
                step of that needed graph paper. The same six steps handle the messier curves in the next
                exercise, vertical asymptotes and all.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
