import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeChoice,
    InlineFeedback,
    InlineFormula,
    InlineLinkedHighlight,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import {
    choicePropsFromDefinition,
    getVariableInfo,
    linkedHighlightPropsFromDefinition,
} from "../variables";
import {
    ACCENT,
    INK,
    INK_QUIET,
    INK_STRUCTURE,
    curveGradient,
    curveY,
    formatSigned,
} from "./turningPoints";

const AMBER = "#F7B23B";

const VIEW_W = 560;
const VIEW_H = 300;
const X_MIN = -4;
const X_MAX = 4;
const PLOT_LEFT = 56;
const PLOT_RIGHT = 504;

const TILE_Y = 56;
const TILE_H = 56;
const TILE_W = 92;
const CURVE_AXIS_Y = 216;
const CURVE_Y_SCALE = 42;

const EASE_150 = { transition: "opacity 150ms ease, stroke-width 150ms ease" } as const;

const xFor = (x: number) => PLOT_LEFT + ((x - X_MIN) / (X_MAX - X_MIN)) * (PLOT_RIGHT - PLOT_LEFT);
const yFor = (y: number) => CURVE_AXIS_Y - y * CURVE_Y_SCALE;

type Band = {
    varName: "signLeft" | "signMiddle" | "signRight";
    from: number;
    to: number;
    testX: number;
    label: string;
};

const BANDS: Band[] = [
    { varName: "signLeft", from: -4, to: -1, testX: -2, label: "x < −1" },
    { varName: "signMiddle", from: -1, to: 1, testX: 0, label: "−1 < x < 1" },
    { varName: "signRight", from: 1, to: 4, testX: 2, label: "x > 1" },
];

const truthFor = (band: Band) => (curveGradient(band.testX) > 0 ? "rising" : "falling");

const formatTestX = (x: number) => (x < 0 ? `−${Math.abs(x)}` : `${x}`);

const segmentPath = (from: number, to: number) => {
    const steps = 60;
    return Array.from({ length: steps + 1 }, (_, i) => {
        const x = from + ((to - from) * i) / steps;
        return `${i === 0 ? "M" : "L"} ${xFor(x)} ${yFor(curveY(x))}`;
    }).join(" ");
};

// ── The prediction tile: the student commits before the curve appears ────────

function PredictionTile({ band, revealed }: { band: Band; revealed: boolean }) {
    const setVar = useSetVar();
    const choice = useVar<string>(band.varName, "");
    const centreX = (xFor(band.from) + xFor(band.to)) / 2;
    const centreY = TILE_Y + TILE_H / 2;

    const matched = choice === truthFor(band);
    const strokeColor = !revealed ? INK_STRUCTURE : matched ? ACCENT : AMBER;

    const slope = choice === "rising" ? -1 : 1;
    const halfW = 24;
    const halfH = 13;

    return (
        <g
            style={{ cursor: "pointer" }}
            onClick={() => setVar(band.varName, choice === "rising" ? "falling" : "rising")}
        >
            <rect
                x={centreX - TILE_W / 2}
                y={TILE_Y}
                width={TILE_W}
                height={TILE_H}
                rx="8"
                fill="#F8FAFC"
                stroke={choice ? strokeColor : INK_QUIET}
                strokeWidth={choice ? 2 : 1.5}
                style={EASE_150}
            />
            {choice === "" ? (
                <>
                    <line
                        x1={centreX - halfW}
                        y1={centreY + 6}
                        x2={centreX + halfW}
                        y2={centreY + 6}
                        stroke={INK_QUIET}
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        strokeLinecap="round"
                    />
                    <text x={centreX} y={centreY - 6} fill={INK_STRUCTURE} fontSize="14" textAnchor="middle">
                        ?
                    </text>
                </>
            ) : (
                <line
                    x1={centreX - halfW}
                    y1={centreY - slope * halfH}
                    x2={centreX + halfW}
                    y2={centreY + slope * halfH}
                    stroke={strokeColor}
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={EASE_150}
                />
            )}
        </g>
    );
}

// ── The drawing ──────────────────────────────────────────────────────────────

function SignTableDrawing() {
    const left = useVar<string>("signLeft", "");
    const middle = useVar<string>("signMiddle", "");
    const right = useVar<string>("signRight", "");
    const highlight = useVar<string>("signTableHighlight", "");
    const setVar = useSetVar();

    const choices: Record<string, string> = { signLeft: left, signMiddle: middle, signRight: right };
    const revealed = Boolean(left && middle && right);

    const bandsActive = highlight === "bands";
    const recede = highlight ? 0.35 : 1;
    const bandWeight = bandsActive ? 2.6 : 1.5;

    return (
        <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            className="block w-full select-none"
            role="img"
            aria-label="A sign table: three clickable tiles, one for each stretch of the x-axis, and the real curve revealed underneath"
        >
            <text x="24" y="36" fill={INK} fontSize="12" opacity={recede} style={EASE_150}>
                Your prediction for the gradient
            </text>

            {/* BAND SEPARATORS — the counterpart of "three stretches" in the prose. */}
            <g
                opacity={1}
                style={EASE_150}
                onPointerEnter={() => setVar("signTableHighlight", "bands")}
                onPointerLeave={() => setVar("signTableHighlight", "")}
            >
                {bandsActive &&
                    [-1, 1].map((x) => (
                        <line
                            key={`halo-${x}`}
                            x1={xFor(x)}
                            y1={48}
                            x2={xFor(x)}
                            y2={262}
                            stroke={ACCENT}
                            strokeWidth={bandWeight + 6}
                            opacity={0.28}
                            strokeLinecap="round"
                        />
                    ))}
                {[-1, 1].map((x) => (
                    <line
                        key={`sep-${x}`}
                        x1={xFor(x)}
                        y1={48}
                        x2={xFor(x)}
                        y2={262}
                        stroke={bandsActive ? ACCENT : INK_QUIET}
                        strokeWidth={bandWeight}
                        strokeDasharray="4 5"
                        strokeLinecap="round"
                        style={EASE_150}
                    />
                ))}
                <g fill={bandsActive ? ACCENT : INK} fontSize="11" style={{ fontVariantNumeric: "tabular-nums" }}>
                    <text x={xFor(-1)} y={274} textAnchor="middle">
                        {"x = −1"}
                    </text>
                    <text x={xFor(1)} y={274} textAnchor="middle">
                        x = 1
                    </text>
                </g>
            </g>

            <g opacity={recede} style={EASE_150}>
                {BANDS.map((band) => (
                    <PredictionTile key={band.varName} band={band} revealed={revealed} />
                ))}

                <g fill={INK} fontSize="12" textAnchor="middle">
                    {BANDS.map((band) => (
                        <text
                            key={`label-${band.varName}`}
                            x={(xFor(band.from) + xFor(band.to)) / 2}
                            y={TILE_Y + TILE_H + 20}
                        >
                            {band.label}
                        </text>
                    ))}
                </g>

                {/* The real curve, revealed only once all three tiles are set. */}
                {revealed && (
                    <>
                        <text x="24" y={196} fill={INK} fontSize="12">
                            The real curve
                        </text>
                        <line
                            x1={PLOT_LEFT}
                            y1={CURVE_AXIS_Y}
                            x2={PLOT_RIGHT}
                            y2={CURVE_AXIS_Y}
                            stroke={INK_QUIET}
                            strokeWidth="1.5"
                        />
                        {BANDS.map((band) => {
                            const matched = choices[band.varName] === truthFor(band);
                            return (
                                <path
                                    key={`curve-${band.varName}`}
                                    d={segmentPath(band.from, band.to)}
                                    fill="none"
                                    stroke={matched ? ACCENT : AMBER}
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            );
                        })}
                        <g fontSize="11" textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
                            {BANDS.map((band) => (
                                <text
                                    key={`test-${band.varName}`}
                                    x={(xFor(band.from) + xFor(band.to)) / 2}
                                    y={TILE_Y + TILE_H + 42}
                                    fill={choices[band.varName] === truthFor(band) ? ACCENT : AMBER}
                                >
                                    {`dy/dx(${formatTestX(band.testX)}) = ${formatSigned(
                                        curveGradient(band.testX),
                                    )}`}
                                </text>
                            ))}
                        </g>
                    </>
                )}
            </g>
        </svg>
    );
}

function SignTableFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="sign-table-figure"
            onReset={() => {
                setVar("signLeft", "");
                setVar("signMiddle", "");
                setVar("signRight", "");
                setVar("signTableHighlight", "");
            }}
            caption="Click each tile to commit to a positive or a negative gradient. Once all three are set, the real curve and the test values appear underneath."
        >
            <SignTableDrawing />
            <InteractionHintSequence
                hintKey="sign-table-click"
                steps={[
                    {
                        gesture: "click",
                        label: "Click a tile to choose rising or falling",
                        position: { x: "25%", y: "26%" },
                    },
                ]}
            />
        </Figure>
    );
}

// ── Blocks ───────────────────────────────────────────────────────────────────

export const signTableBlocks: ReactElement[] = [
    <StackLayout key="layout-sign-table-heading" maxWidth="xl">
        <Block id="sign-table-heading" padding="md">
            <EditableH2 id="h2-sign-table-heading" blockId="sign-table-heading">
                Sign Table for the First Derivative
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-table-invite" maxWidth="xl">
        <Block id="sign-table-invite" padding="sm">
            <EditableParagraph id="para-sign-table-invite" blockId="sign-table-invite">
                The two turning points cut the axis into{" "}
                <InlineLinkedHighlight
                    varName="signTableHighlight"
                    highlightId="bands"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo("signTableHighlight"))}
                >
                    three stretches
                </InlineLinkedHighlight>
                , and inside a stretch the first derivative cannot change sign. That means one test value
                settles the whole interval. Commit first: click each tile to say whether you think the
                gradient there is positive or negative.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-table-figure" maxWidth="xl">
        <Block id="sign-table-prediction" padding="sm" hasVisualization>
            <SignTableFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-table-reflect" maxWidth="xl">
        <Block id="sign-table-reflect" padding="sm">
            <EditableParagraph id="para-sign-table-reflect" blockId="sign-table-reflect">
                Substituting <InlineFormula latex="x = -2, 0, 2" colorMap={{}} /> into the factorised
                derivative fills in the sign table and settles all three intervals without plotting a
                point. Guessing the shape gets you two out of three on a good day. The sign test gets you
                all three, every time.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-table-question-sign" maxWidth="xl">
        <Block id="sign-table-question-sign" padding="md">
            <EditableParagraph id="para-sign-table-question-sign" blockId="sign-table-question-sign">
                Another curve has{" "}
                <InlineFormula latex="\frac{dy}{dx} = \frac{3(x-2)(x+2)}{(1+x^2)^2}" colorMap={{}} />, with
                stationary points at <InlineFormula latex="x = 2" colorMap={{}} /> and{" "}
                <InlineFormula latex="x = -2" colorMap={{}} />. Test the interval between them with{" "}
                <InlineFormula latex="x = 0" colorMap={{}} />: the gradient there is{" "}
                <InlineFeedback
                    varName="signTableGradient"
                    correctValue="negative"
                    position="terminal"
                    successMessage="— right, 3(−2)(2) is negative, and the denominator is always positive"
                    failureMessage="— have another look"
                    hint="Put x = 0 into 3(x − 2)(x + 2) and check the sign of each bracket"
                    reviewBlockId="sign-table-prediction"
                    reviewLabel="Back to the sign table"
                >
                    <InlineClozeChoice
                        varName="signTableGradient"
                        correctAnswer="negative"
                        options={["positive", "negative", "zero"]}
                        {...choicePropsFromDefinition(getVariableInfo("signTableGradient"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sign-table-question-shape" maxWidth="xl">
        <Block id="sign-table-question-shape" padding="md">
            <EditableParagraph id="para-sign-table-question-shape" blockId="sign-table-question-shape">
                So on the interval from <InlineFormula latex="x = -2" colorMap={{}} /> to{" "}
                <InlineFormula latex="x = 2" colorMap={{}} />, that curve is{" "}
                <InlineFeedback
                    varName="signTableShape"
                    correctValue="decreasing"
                    position="terminal"
                    successMessage="— exactly, a negative first derivative across an interval means the function is decreasing there"
                    failureMessage="— not quite"
                    hint="A negative first derivative across a whole interval can only mean one thing about the y-values"
                    reviewBlockId="sign-table-prediction"
                    reviewLabel="Back to the sign table"
                >
                    <InlineClozeChoice
                        varName="signTableShape"
                        correctAnswer="decreasing"
                        options={["increasing", "decreasing", "constant"]}
                        {...choicePropsFromDefinition(getVariableInfo("signTableShape"))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
