import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import { EditableH2, EditableParagraph, InlineFormula } from "@/components/atoms";

export const graphSketchConclusionBlocks: ReactElement[] = [
    <StackLayout key="layout-sketch-conclusion-heading" maxWidth="xl">
        <Block id="sketch-conclusion-heading" padding="md">
            <EditableH2 id="h2-sketch-conclusion-heading" blockId="sketch-conclusion-heading">
                The Finished Sketch
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-conclusion-routine" maxWidth="xl">
        <Block id="sketch-conclusion-routine" padding="sm">
            <EditableParagraph id="para-sketch-conclusion-routine" blockId="sketch-conclusion-routine">
                A sketch is never a guess. Differentiate and factorise; set the numerator of
                {" "}<InlineFormula latex="\frac{dy}{dx}" colorMap={{}} /> to zero for the turning points and
                its denominator to zero for the vertical asymptotes; sign-test every stretch in between;
                then run the same sign test on <InlineFormula latex="\frac{d^2y}{dx^2}" colorMap={{}} /> to
                catch the places where the bend flips.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-sketch-conclusion-payoff" maxWidth="xl">
        <Block id="sketch-conclusion-payoff" padding="sm">
            <EditableParagraph id="para-sketch-conclusion-payoff" blockId="sketch-conclusion-payoff">
                The curve you painted, <InlineFormula latex="y = \frac{2x}{1+x^2}" colorMap={{}} />, falls on
                both outer stretches, climbs between{" "}
                <InlineFormula latex="(-1, -1)" colorMap={{}} /> and{" "}
                <InlineFormula latex="(1, 1)" colorMap={{}} />, and changes its bend three times. Not one
                step of that needed graph paper. The same four moves handle the messier curves in the next
                exercise, vertical asymptotes and all.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
