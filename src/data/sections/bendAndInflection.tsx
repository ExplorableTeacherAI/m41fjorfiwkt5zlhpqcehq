import React, { useEffect, useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeChoice,
    InlineClozeInput,
    InlineFeedback,
    InlineFormula,
    InlineLinkedHighlight,
    InlineScrubbleNumber,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FigureSlider, FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, remap, useSpring, type Vec2 } from "@/lib/motion";
import {
    clozePropsFromDefinition,
    choicePropsFromDefinition,
    getVariableInfo,
    linkedHighlightPropsFromDefinition,
    numberPropsFromDefinition,
} from "../variables";
import { ACCENT, INK, INK_QUIET, INK_STRUCTURE, curveY, formatX } from "./turningPoints";

const INDIGO = "#8E90F5";
const ROOT_THREE = Math.sqrt(3);

export const secondDerivative = (x: number) =>
    (4 * x * (x * x - 3)) / Math.pow(1 + x * x, 3);

const VIEW_W = 560;
const VIEW_H = 320;
const X_MIN = -4;
const X_MAX = 4;
const PLOT_LEFT = 56;
const PLOT_RIGHT = 504;
const AXIS_Y = 176;
const Y_SCALE = 90;

const DEFAULT_X = -3.2;

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;

const xFor = (x: number) => remap(x, X_MIN, X_MAX, PLOT_LEFT, PLOT_RIGHT);
const yFor = (y: number) => AXIS_Y - y * Y_SCALE;

const formatBend = (v: number) => `${v < 0 ? "−" : "+"}${Math.abs(v).toFixed(2)}`;
const snap = (v: number) => Math.round(v / 0.05) * 0.05;

const pathBetween = (from: number, to: number) => {
    const steps = Math.max(2, Math.round((to - from) / 0.04));
    return Array.from({ length: steps + 1 }, (_, i) => {
        const x = from + ((to - from) * i) / steps;
        return `${i === 0 ? "M" : "L"} ${xFor(x)} ${yFor(curveY(x))}`;
    }).join(" ");
};

const fullCurvePath = pathBetween(X_MIN, X_MAX);

const svgPointFromEvent = (event: React.PointerEvent, svg: SVGSVGElement | null): Vec2 => {
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
        x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
        y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
    };
};

/** Split the painted stretch at the places where the bend flips. */
const paintedSegments = (from: number, to: number) => {
    const cuts = [-ROOT_THREE, 0, ROOT_THREE].filter((c) => c > from && c < to);
    const edges = [from, ...cuts, to];
    return edges.slice(0, -1).map((start, i) => {
        const end = edges[i + 1];
        const middle = (start + end) / 2;
        return { start, end, up: secondDerivative(middle) > 0 };
    });
};

function BendDrawing() {
    const setVar = useSetVar();
    const x = useVar<number>("bendX", DEFAULT_X);
    const visitedMin = useVar<number>("bendVisitedMin", DEFAULT_X);
    const visitedMax = useVar<number>("bendVisitedMax", DEFAULT_X);
    const highlight = useVar<string>("bendHighlight", "");

    const [dragging, setDragging] = useState(false);
    const [hovered, setHovered] = useState(false);
    const draggingRef = useRef(false);
    const svgRef = useRef<SVGSVGElement>(null);
    const handleScale = useSpring(dragging || hovered ? 1.15 : 1, { stiffness: 400, damping: 26 });

    useEffect(() => {
        if (x < visitedMin) setVar("bendVisitedMin", x);
        if (x > visitedMax) setVar("bendVisitedMax", x);
    }, [x, visitedMin, visitedMax, setVar]);

    const bend = secondDerivative(x);
    const bendingUp = bend > 0;
    const markerColor = bendingUp ? ACCENT : INDIGO;
    const markerX = xFor(x);
    const markerY = yFor(curveY(x));

    const segments = paintedSegments(visitedMin, visitedMax);
    const revealedCuts = [-ROOT_THREE, 0, ROOT_THREE].filter(
        (c) => c > visitedMin && c < visitedMax,
    );

    const opacityFor = (id: string) => (highlight && highlight !== id ? 0.32 : 1);
    const hoverProps = (id: string) => ({
        onPointerEnter: () => setVar("bendHighlight", id),
        onPointerLeave: () => setVar("bendHighlight", ""),
    });

    const cupPath = bendingUp
        ? `M ${markerX - 14} ${markerY - 34} Q ${markerX} ${markerY - 10} ${markerX + 14} ${markerY - 34}`
        : `M ${markerX - 14} ${markerY - 12} Q ${markerX} ${markerY - 36} ${markerX + 14} ${markerY - 12}`;

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full select-none"
            role="img"
            aria-label="The curve with a draggable point that paints the curve in the colour of its bend direction"
        >
            <defs>
                <filter id="bend-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g fontSize="12" opacity={highlight ? 0.32 : 1} style={{ fontVariantNumeric: "tabular-nums", ...EASE_150 }}>
                <text x="24" y="34" fill={INK}>{`x = ${formatX(x)}`}</text>
                <text x={VIEW_W - 24} y="34" fill={markerColor} textAnchor="end">
                    {`d²y/dx² = ${formatBend(bend)}`}
                </text>
                <text x={VIEW_W - 24} y="54" fill={markerColor} textAnchor="end">
                    {bendingUp ? "concave up" : "concave down"}
                </text>
            </g>

            <g opacity={highlight ? 0.32 : 1} style={EASE_150}>
                <line x1={PLOT_LEFT} y1={AXIS_Y} x2={PLOT_RIGHT} y2={AXIS_Y} stroke={INK_QUIET} strokeWidth="1.5" />
                <line x1={xFor(0)} y1={80} x2={xFor(0)} y2={272} stroke={INK_QUIET} strokeWidth="1.5" />
                <g fill={INK} fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <text x={xFor(0) - 6} y={yFor(1) + 4} textAnchor="end">1</text>
                    <text x={xFor(0) - 6} y={yFor(-1) + 4} textAnchor="end">{"−1"}</text>
                </g>
                {/* Unpainted curve: the before-state the painting is read against. */}
                <path d={fullCurvePath} fill="none" stroke={INK_QUIET} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>

            {/* Boundary markers appear only once the paint has crossed them. */}
            <g opacity={highlight ? 0.32 : 1} style={EASE_150}>
                {revealedCuts.map((cut) => (
                    <g key={`cut-${cut.toFixed(2)}`}>
                        <line
                            x1={xFor(cut)}
                            y1={96}
                            x2={xFor(cut)}
                            y2={270}
                            stroke={INK_STRUCTURE}
                            strokeWidth="1.5"
                            strokeDasharray="4 5"
                            strokeLinecap="round"
                        />
                        <text x={xFor(cut)} y={292} fill={INK} fontSize="11" textAnchor="middle">
                            {cut < -1 ? "−√3" : cut > 1 ? "√3" : "0"}
                        </text>
                    </g>
                ))}
            </g>

            {/* The painted trace, split and coloured by the sign of the second derivative. */}
            {segments.map((segment) => (
                <g
                    key={`paint-${segment.start.toFixed(2)}`}
                    {...hoverProps(segment.up ? "up" : "down")}
                    opacity={opacityFor(segment.up ? "up" : "down")}
                    style={EASE_150}
                >
                    {highlight === (segment.up ? "up" : "down") && (
                        <path
                            d={pathBetween(segment.start, segment.end)}
                            fill="none"
                            stroke={segment.up ? ACCENT : INDIGO}
                            strokeWidth="9.5"
                            opacity={0.28}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    )}
                    <path
                        d={pathBetween(segment.start, segment.end)}
                        fill="none"
                        stroke={segment.up ? ACCENT : INDIGO}
                        strokeWidth={highlight === (segment.up ? "up" : "down") ? 4.5 : 3}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        style={EASE_150}
                    />
                </g>
            ))}

            {/* The cup glyph rides with the point and flips when the bend flips. */}
            <path
                d={cupPath}
                fill="none"
                stroke={markerColor}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity={highlight ? 0.32 : 1}
                style={EASE_150}
            />

            <g transform={`translate(${markerX} ${markerY}) scale(${handleScale})`}>
                <circle r="8" fill={markerColor} filter="url(#bend-handle-shadow)" />
            </g>
            <circle
                cx={markerX}
                cy={markerY}
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
                        "bendX",
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

function BendFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="bend-figure"
            onReset={() => {
                setVar("bendX", DEFAULT_X);
                setVar("bendVisitedMin", DEFAULT_X);
                setVar("bendVisitedMax", DEFAULT_X);
                setVar("bendHighlight", "");
            }}
            caption="Drag the point from one end of the curve to the other. It paints the curve behind it, and the colour flips every time the concavity changes."
        >
            <BendDrawing />
            <div className="px-6 pb-5">
                <FigureSlider
                    varName="bendX"
                    label="Point at x"
                    {...numberPropsFromDefinition(getVariableInfo("bendX"))}
                    formatValue={formatX}
                />
            </div>
            <InteractionHintSequence
                hintKey="bend-paint-drag"
                steps={[
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the point right to paint the curve",
                        position: { x: "18%", y: "57%" },
                        dragPath: { type: "line", startOffset: { x: -18, y: 0 }, endOffset: { x: 34, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

export const bendAndInflectionBlocks: ReactElement[] = [
    <StackLayout key="layout-bend-heading" maxWidth="xl">
        <Block id="bend-heading" padding="md">
            <EditableH2 id="h2-bend-heading" blockId="bend-heading">
                Concavity and Points of Inflection
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-formula" maxWidth="xl">
        <Block id="bend-formula" padding="lg">
            <FormulaBlock latex="\frac{d^2y}{dx^2} = \frac{4x(x-\sqrt{3})(x+\sqrt{3})}{(1+x^2)^3}" />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-invite" maxWidth="xl">
        <Block id="bend-invite" padding="sm">
            <EditableParagraph id="para-bend-invite" blockId="bend-invite">
                Increasing and decreasing is only half the story, because a curve can climb while curving
                upward or while curving downward. That shape is its concavity, and the second derivative
                measures it. Drag the point, now at <InlineScrubbleNumber
                    varName="bendX"
                    {...numberPropsFromDefinition(getVariableInfo("bendX"))}
                    formatValue={formatX}
                />, all the way across and paint the whole curve.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-figure" maxWidth="xl">
        <Block id="bend-painting" padding="sm" hasVisualization>
            <BendFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-reflect" maxWidth="xl">
        <Block id="bend-reflect" padding="sm">
            <EditableParagraph id="para-bend-reflect" blockId="bend-reflect">
                The paint switches between{" "}
                <InlineLinkedHighlight
                    varName="bendHighlight"
                    highlightId="up"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("bendHighlight"))}
                >
                    concave up
                </InlineLinkedHighlight>{" "}
                and{" "}
                <InlineLinkedHighlight
                    varName="bendHighlight"
                    highlightId="down"
                    color={INDIGO}
                    bgColor="rgba(142, 144, 245, 0.22)"
                >
                    concave down
                </InlineLinkedHighlight>{" "}
                at <InlineFormula latex="x = -\sqrt{3}, \; 0, \; \sqrt{3}" colorMap={{}} />, exactly where
                the numerator is zero. A zero on its own is not enough, though: each one is a point of
                inflection only because the sign genuinely changes on either side of it.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-question-direction" maxWidth="xl">
        <Block id="bend-question-direction" padding="md">
            <EditableParagraph id="para-bend-question-direction" blockId="bend-question-direction">
                At <InlineFormula latex="x = 1" colorMap={{}} />, this curve is{" "}
                <InlineFeedback
                    varName="bendDirection"
                    correctValue="concave down"
                    position="terminal"
                    successMessage="— yes, x = 1 lies between the zeros at 0 and √3, where the second derivative is negative"
                    failureMessage="— take another look"
                    hint="Ask which two of the three zeros x = 1 lies between"
                    visualizationHint={{
                        blockId: "bend-painting",
                        hintKey: "bend-direction-discovery",
                        label: "Discover it yourself",
                        resetVars: { bendX: -3.2, bendVisitedMin: -3.2, bendVisitedMax: -3.2 },
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the point right to x = 0 and watch the colour flip",
                                position: { x: "30%", y: "57%" },
                                completionVar: "bendX",
                                completionValue: 0,
                                completionTolerance: 0.2,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Keep going to x = 1 and read the concavity written above",
                                position: { x: "55%", y: "40%" },
                                completionVar: "bendX",
                                completionValue: 1,
                                completionTolerance: 0.2,
                            },
                        ],
                    }}
                >
                    <InlineClozeChoice
                        varName="bendDirection"
                        correctAnswer="concave down"
                        options={["concave up", "concave down"]}
                        {...choicePropsFromDefinition(getVariableInfo("bendDirection"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-bend-question-count" maxWidth="xl">
        <Block id="bend-question-count" padding="md">
            <EditableParagraph id="para-bend-question-count" blockId="bend-question-count">
                Counting only the zeros where the sign really does change, the number of points of
                inflection on this curve is{" "}
                <InlineFeedback
                    varName="inflectionCount"
                    correctValue={["3", "three"]}
                    position="terminal"
                    successMessage="— correct, the colour flips at all three of them"
                    failureMessage="— not quite"
                    hint="Count the colour changes along the painted curve, not the number of colours"
                    reviewBlockId="bend-painting"
                    reviewLabel="Back to the painted curve"
                >
                    <InlineClozeInput
                        varName="inflectionCount"
                        correctAnswer={["3", "three"]}
                        {...clozePropsFromDefinition(getVariableInfo("inflectionCount"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
