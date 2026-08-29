import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import { EditableH2, EditableParagraph, InlineFormula } from "@/components/atoms";

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

    <StackLayout key="layout-sketch-conclusion-payoff" maxWidth="xl">
        <Block id="sketch-conclusion-payoff" padding="sm">
            <EditableParagraph id="para-sketch-conclusion-payoff" blockId="sketch-conclusion-payoff">
                The curve you painted, <InlineFormula latex="y = \frac{2x}{1+x^2}" colorMap={{}} />, is decreasing on
                both outer intervals, increasing between{" "}
                <InlineFormula latex="(-1, -1)" colorMap={{}} /> and{" "}
                <InlineFormula latex="(1, 1)" colorMap={{}} />, and changes concavity three times. Not one
                step of that needed graph paper. The same four moves handle the messier curves in the next
                exercise, vertical asymptotes and all.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
