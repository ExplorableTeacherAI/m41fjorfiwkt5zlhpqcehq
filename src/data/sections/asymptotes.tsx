import React, { useRef, useState, type ReactElement } from "react";
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
import { Figure, FigureSlider } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, remap, useSpring, type Vec2 } from "@/lib/motion";
import {
    clozePropsFromDefinition,
    getVariableInfo,
    linkedHighlightPropsFromDefinition,
    numberPropsFromDefinition,
} from "../variables";
import { ACCENT, INK, INK_QUIET, INK_STRUCTURE, formatX } from "./turningPoints";

// ── The model: y = 2x / (x^2 + c) ────────────────────────────────────────────

const denominator = (x: number, c: number) => x * x + c;
const rationalY = (x: number, c: number) => (2 * x) / denominator(x, c);

const VIEW_W = 360;
const VIEW_H = 300;
const X_MIN = -3;
const X_MAX = 3;
const PLOT_LEFT = 40;
const PLOT_RIGHT = 328;

const A_AXIS_Y = 196;
const A_SCALE = 20;
const A_TOP_VALUE = 5;
const A_BOTTOM_VALUE = -3.4;

const B_AXIS_Y = 176;
const B_SCALE = 40;
const B_LIMIT = 2.5;

const DEFAULT_C = 1;
const DEFAULT_PROBE = 1.6;

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;

const xFor = (x: number) => remap(x, X_MIN, X_MAX, PLOT_LEFT, PLOT_RIGHT);
const aYFor = (v: number) => A_AXIS_Y - v * A_SCALE;
const bYFor = (v: number) => B_AXIS_Y - v * B_SCALE;

const formatValue = (v: number) => `${v < 0 ? "−" : ""}${Math.abs(v).toFixed(2)}`;
const snap = (v: number) => Math.round(v / 0.05) * 0.05;

/** Build polyline paths, breaking wherever the graph leaves the drawing band. */
const buildPaths = (
    valueAt: (x: number) => number,
    keep: (v: number, x: number) => boolean,
    toY: (v: number) => number,
) => {
    const paths: string[] = [];
    let current: string[] = [];
    for (let i = 0; i <= 600; i += 1) {
        const x = X_MIN + (i * (X_MAX - X_MIN)) / 600;
        const v = valueAt(x);
        if (!Number.isFinite(v) || !keep(v, x)) {
            if (current.length > 1) paths.push(current.join(" "));
            current = [];
            continue;
        }
        current.push(`${current.length === 0 ? "M" : "L"} ${xFor(x)} ${toY(v)}`);
    }
    if (current.length > 1) paths.push(current.join(" "));
    return paths;
};

const svgPointFromEvent = (event: React.PointerEvent, svg: SVGSVGElement | null): Vec2 => {
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
        y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
};

const useAsymptoteHighlight = () => {
    const highlight = useVar<string>("asymptoteHighlight", "");
    const setVar = useSetVar();
    return {
        opacity: (id: string) => (highlight && highlight !== id ? 0.32 : 1),
        weight: (id: string, resting: number) => (highlight === id ? resting * 1.6 : resting),
        isActive: (id: string) => highlight === id,
        hoverProps: (id: string) => ({
            onPointerEnter: () => setVar("asymptoteHighlight", id),
            onPointerLeave: () => setVar("asymptoteHighlight", ""),
        }),
    };
};

// ── Shared readouts: the causal chain, identical in both views ───────────────

function SharedReadouts({ probeX, c }: { probeX: number; c: number }) {
    const { opacity } = useAsymptoteHighlight();
    const d = denominator(probeX, c);
    const undefinedHere = Math.abs(d) < 0.03;
    return (
        <g fontSize="12" style={{ fontVariantNumeric: "tabular-nums", ...EASE_150 }} opacity={opacity("__readout")}>
            <text x="24" y="32" fill={INK}>{`x = ${formatX(probeX)}`}</text>
            <text x={VIEW_W - 24} y="32" fill={INK} textAnchor="end">
                {`x² + c = ${formatValue(d)}`}
            </text>
            <text x={VIEW_W - 24} y="52" fill={ACCENT} textAnchor="end">
                {undefinedHere ? "y is undefined" : `y = ${formatValue(rationalY(probeX, c))}`}
            </text>
        </g>
    );
}

function RootLabel({ c }: { c: number }) {
    const { opacity } = useAsymptoteHighlight();
    if (c > 0) return null;
    const root = Math.sqrt(-c);
    return (
        <text
            x={xFor(0)}
            y={68}
            fill={ACCENT}
            fontSize="11"
            textAnchor="middle"
            opacity={opacity("roots")}
            style={{ fontVariantNumeric: "tabular-nums", ...EASE_150 }}
        >
            {root < 0.03 ? "x = 0" : `x = ±${root.toFixed(2)}`}
        </text>
    );
}

// ── VIEW A: the denominator, x^2 + c ─────────────────────────────────────────

function DenominatorDrawing() {
    const setVar = useSetVar();
    const c = useVar<number>("asymptoteC", DEFAULT_C);
    const probeX = useVar<number>("asymptoteProbeX", DEFAULT_PROBE);
    const { opacity, weight, isActive, hoverProps } = useAsymptoteHighlight();

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const draggingRef = useRef(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const handleScale = useSpring(dragging || hovered ? 1.15 : 1, { stiffness: 400, damping: 26 });

    const paths = buildPaths(
        (x) => denominator(x, c),
        (v) => v <= A_TOP_VALUE && v >= A_BOTTOM_VALUE,
        aYFor,
    );
    const root = c <= 0 ? Math.sqrt(-c) : null;
    const vertexY = aYFor(c);
    const probePixel = xFor(probeX);
    const probeValue = denominator(probeX, c);
    const probeInBand = probeValue <= A_TOP_VALUE && probeValue >= A_BOTTOM_VALUE;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full select-none"
            role="img"
            aria-label="The parabola x squared plus c, with a draggable vertex; where it crosses the axis it has roots"
        >
            <defs>
                <filter id="asymptote-vertex-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <SharedReadouts probeX={probeX} c={c} />
            <RootLabel c={c} />

            <g opacity={opacity("__structure")} style={EASE_150}>
                <line x1={PLOT_LEFT} y1={A_AXIS_Y} x2={PLOT_RIGHT} y2={A_AXIS_Y} stroke={INK_QUIET} strokeWidth="1.5" />
                <line x1={xFor(0)} y1={96} x2={xFor(0)} y2={264} stroke={INK_QUIET} strokeWidth="1.5" />
                <g fill={INK} fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <text x={xFor(-2)} y={A_AXIS_Y + 18} textAnchor="middle">{"−2"}</text>
                    <text x={xFor(2)} y={A_AXIS_Y + 18} textAnchor="middle">2</text>
                    <text x="24" y={88} textAnchor="start">{"y = x² + c"}</text>
                </g>
                {paths.map((d, i) => (
                    <path key={`denom-${i}`} d={d} fill="none" stroke={INK_STRUCTURE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ))}
            </g>

            <line x1={probePixel} y1={96} x2={probePixel} y2={264} stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 4" opacity={0.5} />
            {probeInBand && <circle cx={probePixel} cy={aYFor(probeValue)} r="4" fill={INK_STRUCTURE} />}

            {/* ROOTS — the counterpart of the vertical asymptotes next door. */}
            {root !== null && (
                <g {...hoverProps("roots")} opacity={opacity("roots")} style={EASE_150}>
                    {(root < 0.03 ? [0] : [-root, root]).map((r) => (
                        <g key={`root-${r.toFixed(3)}`}>
                            {isActive("roots") && (
                                <line x1={xFor(r)} y1={96} x2={xFor(r)} y2={264} stroke={ACCENT} strokeWidth={weight("roots", 2) + 6} opacity={0.28} strokeLinecap="round" />
                            )}
                            <line x1={xFor(r)} y1={96} x2={xFor(r)} y2={264} stroke={ACCENT} strokeWidth={weight("roots", 2)} strokeDasharray="5 5" strokeLinecap="round" style={EASE_150} />
                            <circle cx={xFor(r)} cy={A_AXIS_Y} r={isActive("roots") ? 7 : 5} fill="#FFFFFF" stroke={ACCENT} strokeWidth="2.5" style={EASE_150} />
                        </g>
                    ))}
                </g>
            )}

            <g transform={`translate(${xFor(0)} ${vertexY}) scale(${handleScale})`}>
                <circle r="8" fill={ACCENT} filter="url(#asymptote-vertex-shadow)" />
            </g>
            <circle
                cx={xFor(0)}
                cy={vertexY}
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
                    setVar("asymptoteC", snap(clamp((A_AXIS_Y - point.y) / A_SCALE, -3, 3)));
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
        </svg>
    );
}

// ── VIEW B: the curve the denominator sits under ─────────────────────────────

function RationalCurveDrawing() {
    const setVar = useSetVar();
    const c = useVar<number>("asymptoteC", DEFAULT_C);
    const probeX = useVar<number>("asymptoteProbeX", DEFAULT_PROBE);
    const { opacity, weight, isActive, hoverProps } = useAsymptoteHighlight();

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const draggingRef = useRef(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const handleScale = useSpring(dragging || hovered ? 1.15 : 1, { stiffness: 400, damping: 26 });

    const paths = buildPaths(
        (x) => rationalY(x, c),
        (v, x) => Math.abs(v) <= B_LIMIT && Math.abs(denominator(x, c)) > 0.03,
        bYFor,
    );
    const root = c <= 0 ? Math.sqrt(-c) : null;
    const probePixel = xFor(probeX);
    const probeValue = rationalY(probeX, c);
    const probeInBand = Number.isFinite(probeValue) && Math.abs(probeValue) <= B_LIMIT;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full select-none"
            role="img"
            aria-label="The curve 2x over x squared plus c, with its vertical and horizontal asymptotes"
        >
            <defs>
                <filter id="asymptote-probe-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <SharedReadouts probeX={probeX} c={c} />
            <RootLabel c={c} />

            <g opacity={opacity("__structure")} style={EASE_150}>
                <line x1={xFor(0)} y1={76} x2={xFor(0)} y2={276} stroke={INK_QUIET} strokeWidth="1.5" />
                {paths.map((d, i) => (
                    <path key={`curve-${i}`} d={d} fill="none" stroke={INK_STRUCTURE} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                ))}
            </g>

            {/* HORIZONTAL ASYMPTOTE — the line the curve flattens onto. */}
            <g {...hoverProps("horizontal")} opacity={opacity("horizontal")} style={EASE_150}>
                {isActive("horizontal") && (
                    <line x1={PLOT_LEFT} y1={B_AXIS_Y} x2={PLOT_RIGHT} y2={B_AXIS_Y} stroke={ACCENT} strokeWidth={weight("horizontal", 2) + 6} opacity={0.28} strokeLinecap="round" />
                )}
                <line
                    x1={PLOT_LEFT}
                    y1={B_AXIS_Y}
                    x2={PLOT_RIGHT}
                    y2={B_AXIS_Y}
                    stroke={isActive("horizontal") ? ACCENT : INK_QUIET}
                    strokeWidth={weight("horizontal", 1.5)}
                    strokeDasharray="5 5"
                    strokeLinecap="round"
                    style={EASE_150}
                />
                <text x={PLOT_RIGHT} y={B_AXIS_Y + 16} fill={isActive("horizontal") ? ACCENT : INK} fontSize="11" textAnchor="end" style={EASE_150}>
                    y = 0
                </text>
            </g>

            <line x1={probePixel} y1={76} x2={probePixel} y2={276} stroke={ACCENT} strokeWidth="1.5" strokeDasharray="3 4" opacity={0.5} />
            {probeInBand && <circle cx={probePixel} cy={bYFor(probeValue)} r="4" fill={INK_STRUCTURE} />}

            {/* VERTICAL ASYMPTOTES — same id as the denominator's roots. */}
            {root !== null && (
                <g {...hoverProps("roots")} opacity={opacity("roots")} style={EASE_150}>
                    {(root < 0.03 ? [0] : [-root, root]).map((r) => (
                        <g key={`asym-${r.toFixed(3)}`}>
                            {isActive("roots") && (
                                <line x1={xFor(r)} y1={76} x2={xFor(r)} y2={276} stroke={ACCENT} strokeWidth={weight("roots", 2) + 6} opacity={0.28} strokeLinecap="round" />
                            )}
                            <line x1={xFor(r)} y1={76} x2={xFor(r)} y2={276} stroke={ACCENT} strokeWidth={weight("roots", 2)} strokeDasharray="5 5" strokeLinecap="round" style={EASE_150} />
                        </g>
                    ))}
                </g>
            )}

            <g transform={`translate(${probePixel} ${B_AXIS_Y}) scale(${handleScale})`}>
                <circle r="8" fill={ACCENT} filter="url(#asymptote-probe-shadow)" />
            </g>
            <circle
                cx={probePixel}
                cy={B_AXIS_Y}
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
                    setVar(
                        "asymptoteProbeX",
                        snap(clamp(remap(point.x, PLOT_LEFT, PLOT_RIGHT, X_MIN, X_MAX), X_MIN, X_MAX)),
                    );
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
        </svg>
    );
}

// ── Figure shells ────────────────────────────────────────────────────────────

function DenominatorFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="asymptote-denominator"
            onReset={() => {
                setVar("asymptoteC", DEFAULT_C);
                setVar("asymptoteProbeX", DEFAULT_PROBE);
                setVar("asymptoteHighlight", "");
            }}
            caption="The denominator on its own. Drag its vertex up and down: below the axis it gains two roots."
        >
            <DenominatorDrawing />
            <div className="px-6 pb-5">
                <FigureSlider
                    varName="asymptoteC"
                    label="c"
                    {...numberPropsFromDefinition(getVariableInfo("asymptoteC"))}
                    formatValue={formatX}
                />
            </div>
            <InteractionHintSequence
                hintKey="asymptote-vertex-drag"
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag the vertex down through the axis",
                        position: { x: "51%", y: "45%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: -18 }, endOffset: { x: 0, y: 26 } },
                    },
                ]}
            />
        </Figure>
    );
}

function RationalCurveFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="asymptote-curve"
            onReset={() => {
                setVar("asymptoteC", DEFAULT_C);
                setVar("asymptoteProbeX", DEFAULT_PROBE);
                setVar("asymptoteHighlight", "");
            }}
            caption="The curve itself. Slide the teal marker along the axis and compare the denominator with the height of the curve."
        >
            <RationalCurveDrawing />
            <InteractionHintSequence
                hintKey="asymptote-probe-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Slide the marker along the axis",
                        position: { x: "72%", y: "52%" },
                        dragPath: { type: "line", startOffset: { x: 26, y: 0 }, endOffset: { x: -30, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export const asymptoteBlocks: ReactElement[] = [
    <StackLayout key="layout-asymptote-heading" maxWidth="xl">
        <Block id="asymptote-heading" padding="md">
            <EditableH2 id="h2-asymptote-heading" blockId="asymptote-heading">
                Vertical and Horizontal Asymptotes
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptote-invite" maxWidth="xl">
        <Block id="asymptote-invite" padding="sm">
            <EditableParagraph id="para-asymptote-invite" blockId="asymptote-invite">
                A fraction explodes when its denominator hits zero, and that is the whole story behind a
                vertical asymptote. On the left is the denominator{" "}
                <InlineFormula latex="x^2 + c" colorMap={{}} />; on the right, the curve{" "}
                <InlineFormula latex="y = \frac{2x}{x^2 + c}" colorMap={{}} /> that sits above it. Drag the
                parabola's vertex down and watch the moment it crosses the axis.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <SplitLayout key="layout-asymptote-pair" ratio="1:1" gap="lg" align="start">
        <Block id="asymptote-denominator-figure" padding="sm" hasVisualization>
            <DenominatorFigure />
        </Block>
        <Block id="asymptote-curve-figure" padding="sm" hasVisualization>
            <RationalCurveFigure />
        </Block>
    </SplitLayout>,

    <StackLayout key="layout-asymptote-vertical" maxWidth="xl">
        <Block id="asymptote-vertical-note" padding="sm">
            <EditableParagraph id="para-asymptote-vertical-note" blockId="asymptote-vertical-note">
                Where the denominator has{" "}
                <InlineLinkedHighlight
                    varName="asymptoteHighlight"
                    highlightId="roots"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("asymptoteHighlight"))}
                >
                    real roots
                </InlineLinkedHighlight>
                , the curve tears into branches that race away beside the dashed lines. At{" "}
                <InlineFormula latex="c =" colorMap={{}} />{" "}
                <InlineScrubbleNumber
                    varName="asymptoteC"
                    {...numberPropsFromDefinition(getVariableInfo("asymptoteC"))}
                    formatValue={formatX}
                />{" "}
                there are no real roots, which is exactly why our curve has no vertical asymptotes.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptote-horizontal" maxWidth="xl">
        <Block id="asymptote-horizontal-note" padding="sm">
            <EditableParagraph id="para-asymptote-horizontal-note" blockId="asymptote-horizontal-note">
                Far out to the sides the denominator grows like{" "}
                <InlineFormula latex="x^2" colorMap={{}} /> while the numerator only grows like{" "}
                <InlineFormula latex="x" colorMap={{}} />, so the curve flattens onto the{" "}
                <InlineLinkedHighlight
                    varName="asymptoteHighlight"
                    highlightId="horizontal"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("asymptoteHighlight"))}
                >
                    horizontal asymptote
                </InlineLinkedHighlight>{" "}
                <InlineFormula latex="y = 0" colorMap={{}} />.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptote-question-vertical" maxWidth="xl">
        <Block id="asymptote-question-vertical" padding="md">
            <EditableParagraph id="para-asymptote-question-vertical" blockId="asymptote-question-vertical">
                Try it on <InlineFormula latex="y = \frac{x+1}{x^2 - 9}" colorMap={{}} />. Its vertical
                asymptotes stand wherever the denominator is zero, so at{" "}
                <InlineFormula latex="x = \pm" colorMap={{}} />{" "}
                <InlineFeedback
                    varName="asymptoteVerticalAnswer"
                    correctValue={["3", "+-3", "±3", "3 and -3", "3, -3"]}
                    position="terminal"
                    successMessage="— right, x² − 9 = 0 at x = 3 and x = −3, so the curve breaks at both"
                    failureMessage="— not yet"
                    hint="Solve x² − 9 = 0, which is the same as x² = 9"
                    visualizationHint={{
                        blockId: "asymptote-denominator-figure",
                        hintKey: "asymptote-roots-discovery",
                        label: "Discover it yourself",
                        resetVars: { asymptoteC: 1, asymptoteProbeX: 1.6, asymptoteHighlight: "" },
                        steps: [
                            {
                                gesture: "drag-vertical",
                                label: "Drag the vertex below the axis until two roots appear",
                                position: { x: "51%", y: "45%" },
                                completionVar: "asymptoteC",
                                completionValue: -1.5,
                                completionTolerance: 1.4,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Now slide the marker on the right toward a dashed line",
                                position: { x: "72%", y: "52%" },
                                completionVar: "asymptoteProbeX",
                                completionValue: 1.2,
                                completionTolerance: 0.6,
                            },
                        ],
                    }}
                >
                    <InlineClozeInput
                        varName="asymptoteVerticalAnswer"
                        correctAnswer={["3", "+-3", "±3", "3 and -3", "3, -3"]}
                        {...clozePropsFromDefinition(getVariableInfo("asymptoteVerticalAnswer"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-asymptote-question-horizontal" maxWidth="xl">
        <Block id="asymptote-question-horizontal" padding="md">
            <EditableParagraph id="para-asymptote-question-horizontal" blockId="asymptote-question-horizontal">
                As <InlineFormula latex="x" colorMap={{}} /> runs off to infinity,{" "}
                <InlineFormula latex="y = \frac{5x}{x^2 + 4}" colorMap={{}} /> settles onto the horizontal
                line <InlineFormula latex="y =" colorMap={{}} />{" "}
                <InlineFeedback
                    varName="asymptoteHorizontalAnswer"
                    correctValue={["0", "y=0", "y = 0"]}
                    position="terminal"
                    successMessage="— correct, the x² in the denominator outruns the 5x on top, so the fraction shrinks to nothing"
                    failureMessage="— have another think"
                    hint="Compare how fast the top and the bottom grow when x is, say, 100"
                    reviewBlockId="asymptote-horizontal-note"
                    reviewLabel="Back to the horizontal asymptote"
                >
                    <InlineClozeInput
                        varName="asymptoteHorizontalAnswer"
                        correctAnswer={["0", "y=0", "y = 0"]}
                        {...clozePropsFromDefinition(getVariableInfo("asymptoteHorizontalAnswer"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
