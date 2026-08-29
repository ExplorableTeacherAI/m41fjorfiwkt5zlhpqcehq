import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import { EditableH1, EditableH3, EditableParagraph, InlineFormula, Table } from "@/components/atoms";

export const graphSketchIntroBlocks: ReactElement[] = [
    <StackLayout key="layout-sketch-intro-title" maxWidth="xl">
        <Block id="sketch-intro-title" padding="md">
            <EditableH1 id="h1-sketch-intro-title" blockId="sketch-intro-title">
                Drawing Graphs Using Differentiation
            </EditableH1>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-intro-hook" maxWidth="xl">
        <Block id="sketch-intro-hook" padding="sm">
            <EditableParagraph id="para-sketch-intro-hook" blockId="sketch-intro-hook">
                Hand a calculator a hundred values of <InlineFormula latex="x" colorMap={{}} /> and it will
                draw <InlineFormula latex="y = \frac{2x}{1 + x^2}" colorMap={{}} /> for you. Take the
                calculator away and most people are stuck. Yet a mathematician can sketch that same curve
                on the back of a receipt, in under two minutes, with every hill, valley and bend in the
                right place.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-intro-promise" maxWidth="xl">
        <Block id="sketch-intro-promise" padding="sm">
            <EditableParagraph id="para-sketch-intro-promise" blockId="sketch-intro-promise">
                The secret is that a curve describes itself, through its derivatives. You can already
                differentiate a quotient, factorise what comes out, and read
                {" "}<InlineFormula latex="\frac{dy}{dx}" colorMap={{}} /> as a gradient. Here you will turn
                those three skills into a finished sketch: locate the stationary points and asymptotes, decide
                where the function is increasing or decreasing, and find its points of inflection.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-intro-method-heading" maxWidth="xl">
        <Block id="sketch-intro-method-heading" padding="md">
            <EditableH3 id="h3-sketch-intro-method-heading" blockId="sketch-intro-method-heading">
                The method, step by step
            </EditableH3>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-intro-method-table" maxWidth="xl">
        <Block id="sketch-intro-method-table" padding="sm">
            <Table
                color="#62D0AD"
                columns={[
                    { header: "Step", width: 190 },
                    { header: "What you do" },
                ]}
                rows={[
                    {
                        cells: [
                            "1. Differentiate",
                            <span key="step-differentiate">
                                Find <InlineFormula latex="\frac{dy}{dx}" colorMap={{}} /> and{" "}
                                <InlineFormula latex="\frac{d^2y}{dx^2}" colorMap={{}} />, and write each one
                                in factorised form.
                            </span>,
                        ],
                    },
                    {
                        cells: [
                            "2. Turning points",
                            <span key="step-turning">
                                Set the numerator of <InlineFormula latex="\frac{dy}{dx}" colorMap={{}} /> to
                                zero, solve for <InlineFormula latex="x" colorMap={{}} />, then substitute back
                                into <InlineFormula latex="y" colorMap={{}} /> for the coordinates.
                            </span>,
                        ],
                    },
                    {
                        cells: [
                            "3. Asymptotes",
                            <span key="step-asymptotes">
                                Set the denominator to zero for the vertical asymptotes, and look at large{" "}
                                <InlineFormula latex="x" colorMap={{}} /> for the horizontal one.
                            </span>,
                        ],
                    },
                    {
                        cells: [
                            "4. Sign of the first derivative",
                            <span key="step-first-sign">
                                Split the axis at those <InlineFormula latex="x" colorMap={{}} /> values and
                                test the sign of <InlineFormula latex="\frac{dy}{dx}" colorMap={{}} /> in every
                                interval.
                            </span>,
                        ],
                    },
                    {
                        cells: [
                            "5. Sign of the second derivative",
                            <span key="step-second-sign">
                                Solve <InlineFormula latex="\frac{d^2y}{dx^2} = 0" colorMap={{}} /> and test the
                                sign either side of each root. A genuine change of sign is a point of inflection.
                            </span>,
                        ],
                    },
                    {
                        cells: [
                            "6. Sketch",
                            <span key="step-sketch">
                                Mark the turning points, asymptotes and points of inflection, then join them up
                                following the signs.
                            </span>,
                        ],
                    },
                ]}
                caption="The six steps, in the order you will meet them here."
            />
        </Block>
    </StackLayout>,
];
