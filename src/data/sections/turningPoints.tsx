import React, { useEffect, useRef, useState, type ReactElement } from "react";
import { SplitLayout, StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeInput,
    InlineFeedback,
    InlineFormula,
    InlineLinkedHighlight,
    InlineScrubbleNumber,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, remap, useSpring, type Vec2 } from "@/lib/motion";
import {
    clozePropsFromDefinition,
    getVariableInfo,
    linkedHighlightPropsFromDefinition,
    numberPropsFromDefinition,
} from "../variables";

// ── The model: y = 2x / (1 + x^2) and its first derivative ───────────────────

export const curveY = (x: number) => (2 * x) / (1 + x * x);
export const curveGradient = (x: number) => (2 - 2 * x * x) / Math.pow(1 + x * x, 2);

// ── Shared view geometry — the same x mapping in BOTH views is the tie ───────

const VIEW_W = 360;
const VIEW_H = 300;
const X_MIN = -4;
const X_MAX = 4;
const PLOT_LEFT = 40;
const PLOT_RIGHT = 328;

const CURVE_AXIS_Y = 168;
const CURVE_Y_SCALE = 82;
const GRAD_ZERO_Y = 236;
const GRAD_Y_SCALE = 76;

const DEFAULT_X = 1.6;

export const INK = "#334155";
export const INK_STRUCTURE = "#64748B";
export const INK_QUIET = "#CBD5E1";
export const ACCENT = "#62D0AD";

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;

export const xFor = (x: number) => remap(x, X_MIN, X_MAX, PLOT_LEFT, PLOT_RIGHT);
const curveYFor = (y: number) => CURVE_AXIS_Y - y * CURVE_Y_SCALE;
const gradYFor = (g: number) => GRAD_ZERO_Y - g * GRAD_Y_SCALE;

// One formatter per quantity, shared by figure, prose and readouts.
export const formatX = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}`;
export const formatSigned = (v: number) =>
    `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(2)}`;

const snap = (v: number) => Math.round(v / 0.05) * 0.05;

const samples = Array.from({ length: 321 }, (_, i) => X_MIN + i * 0.025);

const curvePath = samples
    .map((x, i) => `${i === 0 ? "M" : "L"} ${xFor(x)} ${curveYFor(curveY(x))}`)
    .join(" ");
const gradientPath = samples
    .map((x, i) => `${i === 0 ? "M" : "L"} ${xFor(x)} ${gradYFor(curveGradient(x))}`)
    .join(" ");

const svgPointFromEvent = (event: React.PointerEvent, svg: SVGSVGElement | null): Vec2 => {
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
        y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
};

// ── Shared highlight channel — hovering in one view answers in both ──────────

const useCurveHighlight = () => {
    const highlight = useVar<string>("curveHighlight", "");
    const setVar = useSetVar();
    return {
        opacity: (id: string) => (highlight && highlight !== id ? 0.35 : 1),
        weight: (id: string, resting: number) => (highlight === id ? resting * 1.6 : resting),
        isActive: (id: string) => highlight === id,
        hoverProps: (id: string) => ({
            onPointerEnter: () => setVar("curveHighlight", id),
            onPointerLeave: () => setVar("curveHighlight", ""),
        }),
    };
};

const Halo = ({ active, children }: { active: boolean; children: React.ReactNode }) =>
    active ? <g opacity={0.28}>{children}</g> : null;

// ── Readout strip, identical in both views ───────────────────────────────────

function SharedReadouts({ x }: { x: number }) {
    const { opacity } = useCurveHighlight();
    return (
        <g fontSize="12" style={{ fontVariantNumeric: "tabular-nums", ...EASE_150 }}>
            <text x="24" y="32" fill={INK} opacity={opacity("__structure")}>
                {`x = ${formatX(x)}`}
            </text>
            <text
                x={VIEW_W - 24}
                y="32"
                fill={ACCENT}
                textAnchor="end"
                opacity={opacity("tangent")}
            >
                {`dy/dx = ${formatSigned(curveGradient(x))}`}
            </text>
        </g>
    );
}

// ── Draggable handle shared by both drawings ─────────────────────────────────

function DragHandle({
    cx,
    cy,
    shadowId,
    onMove,
}: {
    cx: number;
    cy: number;
    shadowId: string;
    onMove: (event: React.PointerEvent<SVGCircleElement>) => void;
}) {
    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const draggingRef = useRef(false);
    const scale = useSpring(dragging || hovered ? 1.15 : 1, { stiffness: 400, damping: 26 });

    return (
        <>
            <g transform={`translate(${cx} ${cy}) scale(${scale})`}>
                <circle r="8" fill={ACCENT} filter={`url(#${shadowId})`} />
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
                    onMove(event);
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

// ── VIEW A: the curve and its tangent ────────────────────────────────────────

function CurveDrawing() {
    const setVar = useSetVar();
    const x = useVar<number>("curveX", DEFAULT_X);
    const foundLeft = useVar<boolean>("foundTurningLeft", false);
    const foundRight = useVar<boolean>("foundTurningRight", false);
    const { opacity, weight, isActive, hoverProps } = useCurveHighlight();
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (Math.abs(x + 1) < 0.08 && !foundLeft) setVar("foundTurningLeft", true);
        if (Math.abs(x - 1) < 0.08 && !foundRight) setVar("foundTurningRight", true);
    }, [x, foundLeft, foundRight, setVar]);

    const pointX = xFor(x);
    const pointY = curveYFor(curveY(x));

    // Constant-length tangent in pixel space, so it never leaves the canvas.
    const gradient = curveGradient(x);
    const dirX = (PLOT_RIGHT - PLOT_LEFT) / (X_MAX - X_MIN);
    const dirY = -CURVE_Y_SCALE * gradient;
    const dirLength = Math.hypot(dirX, dirY);
    const ux = (dirX / dirLength) * 48;
    const uy = (dirY / dirLength) * 48;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full select-none"
            role="img"
            aria-label="The curve y = 2x over 1 plus x squared, with a draggable point carrying its tangent line"
        >
            <defs>
                <filter id="turning-curve-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <SharedReadouts x={x} />

            <g opacity={opacity("__structure")} style={EASE_150}>
                <line x1={PLOT_LEFT} y1={CURVE_AXIS_Y} x2={PLOT_RIGHT} y2={CURVE_AXIS_Y} stroke={INK_QUIET} strokeWidth="1.5" />
                <line x1={xFor(0)} y1={80} x2={xFor(0)} y2={256} stroke={INK_QUIET} strokeWidth="1.5" />
                <g fill={INK} fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <text x={xFor(0) - 6} y={curveYFor(1) + 4} textAnchor="end">1</text>
                    <text x={xFor(0) - 6} y={curveYFor(-1) + 4} textAnchor="end">{"−1"}</text>
                    <text x={xFor(-2)} y={CURVE_AXIS_Y + 18} textAnchor="middle">{"−2"}</text>
                    <text x={xFor(2)} y={CURVE_AXIS_Y + 18} textAnchor="middle">2</text>
                </g>
                <path d={curvePath} fill="none" stroke={INK_STRUCTURE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Vertical guide at the shared x — the same line stands in view B. */}
            <line
                x1={pointX}
                y1={84}
                x2={pointX}
                y2={254}
                stroke={ACCENT}
                strokeWidth="1.5"
                strokeDasharray="3 4"
                opacity={0.5}
            />

            {/* TANGENT — the accent element, and the counterpart of the zero
                line in the gradient view. */}
            <g {...hoverProps("tangent")} opacity={opacity("tangent")} style={EASE_150}>
                <Halo active={isActive("tangent")}>
                    <line
                        x1={pointX - ux}
                        y1={pointY - uy}
                        x2={pointX + ux}
                        y2={pointY + uy}
                        stroke={ACCENT}
                        strokeWidth={weight("tangent", 3) + 6}
                        strokeLinecap="round"
                    />
                </Halo>
                <line
                    x1={pointX - ux}
                    y1={pointY - uy}
                    x2={pointX + ux}
                    y2={pointY + uy}
                    stroke={ACCENT}
                    strokeWidth={weight("tangent", 3)}
                    strokeLinecap="round"
                />
            </g>

            {/* TURNING POINTS — appear only once the student parks on them. */}
            <g {...hoverProps("zeros")} opacity={opacity("zeros")} style={EASE_150} fontSize="11">
                {foundRight && (
                    <>
                        <circle cx={xFor(1)} cy={curveYFor(1)} r={isActive("zeros") ? 9 : 7} fill="none" stroke={ACCENT} strokeWidth={weight("zeros", 2.5)} />
                        <text x={xFor(1) + 12} y={curveYFor(1) - 10} fill={INK} textAnchor="start">(1, 1)</text>
                    </>
                )}
                {foundLeft && (
                    <>
                        <circle cx={xFor(-1)} cy={curveYFor(-1)} r={isActive("zeros") ? 9 : 7} fill="none" stroke={ACCENT} strokeWidth={weight("zeros", 2.5)} />
                        <text x={xFor(-1) - 12} y={curveYFor(-1) + 20} fill={INK} textAnchor="end">{"(−1, −1)"}</text>
                    </>
                )}
            </g>

            <DragHandle
                cx={pointX}
                cy={pointY}
                shadowId="turning-curve-shadow"
                onMove={(event) => {
                    const point = svgPointFromEvent(event, svgRef.current);
                    setVar("curveX", snap(clamp(remap(point.x, PLOT_LEFT, PLOT_RIGHT, X_MIN, X_MAX), X_MIN, X_MAX)));
                }}
            />
        </svg>
    );
}

// ── VIEW B: the gradient plotted against the same x ──────────────────────────

function GradientDrawing() {
    const setVar = useSetVar();
    const x = useVar<number>("curveX", DEFAULT_X);
    const foundLeft = useVar<boolean>("foundTurningLeft", false);
    const foundRight = useVar<boolean>("foundTurningRight", false);
    const { opacity, weight, isActive, hoverProps } = useCurveHighlight();
    const svgRef = useRef<SVGSVGElement>(null);

    const markerX = xFor(x);
    const markerY = gradYFor(curveGradient(x));

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full select-none"
            role="img"
            aria-label="Graph of dy by dx against x, with a draggable marker on the gradient curve"
        >
            <defs>
                <filter id="turning-gradient-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <SharedReadouts x={x} />

            <g opacity={opacity("__structure")} style={EASE_150}>
                <path d={gradientPath} fill="none" stroke={INK_STRUCTURE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <g fill={INK} fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <text x={xFor(-2)} y={GRAD_ZERO_Y + 32} textAnchor="middle">{"−2"}</text>
                    <text x={xFor(2)} y={GRAD_ZERO_Y + 32} textAnchor="middle">2</text>
                </g>
            </g>

            <line
                x1={markerX}
                y1={80}
                x2={markerX}
                y2={GRAD_ZERO_Y + 20}
                stroke={ACCENT}
                strokeWidth="1.5"
                strokeDasharray="3 4"
                opacity={0.5}
            />

            {/* ZERO LINE — the counterpart of the flat tangent next door. */}
            <g {...hoverProps("tangent")} opacity={opacity("tangent")} style={EASE_150}>
                <Halo active={isActive("tangent")}>
                    <line x1={PLOT_LEFT} y1={GRAD_ZERO_Y} x2={PLOT_RIGHT} y2={GRAD_ZERO_Y} stroke={ACCENT} strokeWidth={weight("tangent", 2.5) + 6} strokeLinecap="round" />
                </Halo>
                <line x1={PLOT_LEFT} y1={GRAD_ZERO_Y} x2={PLOT_RIGHT} y2={GRAD_ZERO_Y} stroke={ACCENT} strokeWidth={weight("tangent", 2.5)} strokeLinecap="round" />
                <text x={PLOT_LEFT} y={GRAD_ZERO_Y - 10} fill={ACCENT} fontSize="12" textAnchor="start">
                    dy/dx = 0
                </text>
            </g>

            <g {...hoverProps("zeros")} opacity={opacity("zeros")} style={EASE_150}>
                {foundRight && (
                    <circle cx={xFor(1)} cy={GRAD_ZERO_Y} r={isActive("zeros") ? 9 : 7} fill="none" stroke={ACCENT} strokeWidth={weight("zeros", 2.5)} />
                )}
                {foundLeft && (
                    <circle cx={xFor(-1)} cy={GRAD_ZERO_Y} r={isActive("zeros") ? 9 : 7} fill="none" stroke={ACCENT} strokeWidth={weight("zeros", 2.5)} />
                )}
            </g>

            <DragHandle
                cx={markerX}
                cy={markerY}
                shadowId="turning-gradient-shadow"
                onMove={(event) => {
                    const point = svgPointFromEvent(event, svgRef.current);
                    setVar("curveX", snap(clamp(remap(point.x, PLOT_LEFT, PLOT_RIGHT, X_MIN, X_MAX), X_MIN, X_MAX)));
                }}
            />
        </svg>
    );
}

// ── Figure shells ────────────────────────────────────────────────────────────

function CurveFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="turning-points-curve"
            onReset={() => {
                setVar("curveX", DEFAULT_X);
                setVar("curveHighlight", "");
                setVar("foundTurningLeft", false);
                setVar("foundTurningRight", false);
            }}
            caption="Drag the teal point along the curve. The short teal line is the tangent, and it tilts with the gradient."
        >
            <CurveDrawing />
            <InteractionHintSequence
                hintKey="turning-points-curve-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the teal point along the curve",
                        position: { x: "67%", y: "28%" },
                        dragPath: { type: "line", startOffset: { x: 24, y: 0 }, endOffset: { x: -28, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

function GradientFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="turning-points-gradient"
            onReset={() => {
                setVar("curveX", DEFAULT_X);
                setVar("curveHighlight", "");
            }}
            caption="The same gradient, plotted against x. Drag this marker instead and the curve beside it follows."
        >
            <GradientDrawing />
            <InteractionHintSequence
                hintKey="turning-points-gradient-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the marker along the gradient graph",
                        position: { x: "67%", y: "72%" },
                        dragPath: { type: "line", startOffset: { x: 24, y: 0 }, endOffset: { x: -28, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export const turningPointsBlocks: ReactElement[] = [
    <StackLayout key="layout-turning-points-heading" maxWidth="xl">
        <Block id="turning-points-heading" padding="md">
            <EditableH2 id="h2-turning-points-heading" blockId="turning-points-heading">
                Stationary Points and Turning Points
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-turning-points-lead" maxWidth="xl">
        <Block id="turning-points-lead" padding="sm">
            <EditableParagraph id="para-turning-points-lead" blockId="turning-points-lead">
                Step one never changes: differentiate, then factorise whatever comes out.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-turning-points-formula" maxWidth="xl">
        <Block id="turning-points-formula" padding="lg">
            <FormulaBlock
                latex="\frac{dy}{dx} = \frac{\highlight{zeros}{-2(x-1)(x+1)}}{(1+x^2)^2}"
                linkedHighlights={{
                    zeros: {
                        varName: "curveHighlight",
                        color: ACCENT,
                        bgColor: "rgba(98, 208, 173, 0.22)",
                    },
                }}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-turning-points-invite" maxWidth="xl">
        <Block id="turning-points-invite" padding="sm">
            <EditableParagraph id="para-turning-points-invite" blockId="turning-points-invite">
                On the left sits the curve; on the right, that gradient plotted against the same
                {" "}<InlineFormula latex="x" colorMap={{}} />. Drag the teal point along the curve, now
                at <InlineScrubbleNumber
                    varName="curveX"
                    {...numberPropsFromDefinition(getVariableInfo("curveX"))}
                    formatValue={formatX}
                />, and watch the marker beside it. Somewhere the{" "}
                <InlineLinkedHighlight
                    varName="curveHighlight"
                    highlightId="tangent"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("curveHighlight"))}
                >
                    tangent
                </InlineLinkedHighlight>{" "}
                lies perfectly flat: find both places.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <SplitLayout key="layout-turning-points-pair" ratio="1:1" gap="lg" align="start">
        <Block id="turning-points-curve-figure" padding="sm" hasVisualization>
            <CurveFigure />
        </Block>
        <Block id="turning-points-gradient-figure" padding="sm" hasVisualization>
            <GradientFigure />
        </Block>
    </SplitLayout>,

    <StackLayout key="layout-turning-points-reflect" maxWidth="xl">
        <Block id="turning-points-reflect" padding="sm">
            <EditableParagraph id="para-turning-points-reflect" blockId="turning-points-reflect">
                Where the tangent is flat the curve is stationary, so{" "}
                <InlineFormula latex="\frac{dy}{dx} = 0" colorMap={{}} />, and a fraction is zero only when
                its numerator is zero. So{" "}
                <InlineFormula latex="-2(x-1)(x+1) = 0" colorMap={{}} /> gives{" "}
                <InlineFormula latex="x = 1" colorMap={{}} /> and{" "}
                <InlineFormula latex="x = -1" colorMap={{}} />, and the curve supplies the y-coordinates of the two turning points:{" "}
                <InlineLinkedHighlight
                    varName="curveHighlight"
                    highlightId="zeros"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("curveHighlight"))}
                >
                    (1, 1) and (&minus;1, &minus;1)
                </InlineLinkedHighlight>
                . The denominator never reaches zero, so this curve has no vertical asymptotes.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-turning-points-question" maxWidth="xl">
        <Block id="turning-points-question" padding="md">
            <EditableParagraph id="para-turning-points-question" blockId="turning-points-question">
                Now a different curve. For <InlineFormula latex="y = \frac{3x}{4 + x^2}" colorMap={{}} />{" "}
                the gradient factorises as{" "}
                <InlineFormula latex="\frac{dy}{dx} = \frac{3(2-x)(2+x)}{(4+x^2)^2}" colorMap={{}} />, so its
                turning points sit at <InlineFormula latex="x = \pm" colorMap={{}} />{" "}
                <InlineFeedback
                    varName="turningPointX"
                    correctValue={["2", "+-2", "±2", "2 and -2", "2, -2"]}
                    position="terminal"
                    successMessage="— exactly, the top of the fraction is zero at x = 2 and x = −2"
                    failureMessage="— not yet"
                    hint="Only the numerator can make a fraction zero, so solve 3(2 − x)(2 + x) = 0"
                    reviewBlockId="turning-points-formula"
                    reviewLabel="Look at the factorised gradient again"
                >
                    <InlineClozeInput
                        varName="turningPointX"
                        correctAnswer={["2", "+-2", "±2", "2 and -2", "2, -2"]}
                        {...clozePropsFromDefinition(getVariableInfo("turningPointX"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
