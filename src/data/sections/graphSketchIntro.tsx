import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import { EditableH1, EditableParagraph, InlineFormula } from "@/components/atoms";

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
];
