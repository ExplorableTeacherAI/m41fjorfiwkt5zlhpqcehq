/**
 * Variables Configuration
 * =======================
 * 
 * CENTRAL PLACE TO DEFINE ALL SHARED VARIABLES
 * 
 * This file defines all variables that can be shared across sections.
 * AI agents should read this file to understand what variables are available.
 * 
 * USAGE:
 * 1. Define variables here with their default values and metadata
 * 2. Use them in any section with: const x = useVar('variableName', defaultValue)
 * 3. Update them with: setVar('variableName', newValue)
 */

import { type VarValue } from '@/stores';

/**
 * Variable definition with metadata
 */
export interface VariableDefinition {
    /** Default value */
    defaultValue: VarValue;
    /** Human-readable label */
    label?: string;
    /** Description for AI agents */
    description?: string;
    /** Variable type hint */
    type?: 'number' | 'text' | 'boolean' | 'select' | 'array' | 'object' | 'spotColor' | 'linkedHighlight';
    /** Unit (e.g., 'Hz', '°', 'm/s') - for numbers */
    unit?: string;
    /** Minimum value (for number sliders) */
    min?: number;
    /** Maximum value (for number sliders) */
    max?: number;
    /** Step increment (for number sliders) */
    step?: number;
    /** Display color for InlineScrubbleNumber / InlineSpotColor (e.g. '#D81B60') */
    color?: string;
    /** Options for 'select' type variables */
    options?: string[];
    /** Placeholder text for text inputs */
    placeholder?: string;
    /**
     * Correct answer for cloze input validation.
     * Accepts a single string, pipe-separated alternates (e.g. "first | 1 | 1st"),
     * or an array of accepted answers (e.g. ["first", "1", "1st"]).
     */
    correctAnswer?: string | string[];
    /** Whether cloze matching is case sensitive */
    caseSensitive?: boolean;
    /** Background color for inline components */
    bgColor?: string;
    /** Schema hint for object types (for AI agents) */
    schema?: string;
}

/**
 * =====================================================
 * 🎯 DEFINE YOUR VARIABLES HERE
 * =====================================================
 * 
 * SUPPORTED TYPES:
 * 
 * 1. NUMBER (slider):
 *    { defaultValue: 5, type: 'number', min: 0, max: 10, step: 1 }
 * 
 * 2. TEXT (free text):
 *    { defaultValue: 'Hello', type: 'text', placeholder: 'Enter text...' }
 * 
 * 3. SELECT (dropdown):
 *    { defaultValue: 'sine', type: 'select', options: ['sine', 'cosine', 'tangent'] }
 * 
 * 4. BOOLEAN (toggle):
 *    { defaultValue: true, type: 'boolean' }
 * 
 * 5. ARRAY (list of numbers):
 *    { defaultValue: [1, 2, 3], type: 'array' }
 * 
 * 6. OBJECT (complex data):
 *    { defaultValue: { x: 5, y: 10 }, type: 'object', schema: '{ x: number, y: number }' }
 */
export const variableDefinitions: Record<string, VariableDefinition> = {
    // ─────────────────────────────────────────
    // SECTION: Where the Curve Turns
    // ─────────────────────────────────────────
    curveX: {
        defaultValue: 1.6,
        type: 'number',
        label: 'x on the curve',
        description: 'Position of the draggable point along y = 2x/(1+x^2)',
        min: -4,
        max: 4,
        step: 0.05,
        color: '#62D0AD',
    },
    curveHighlight: {
        defaultValue: '',
        type: 'text',
        label: 'Curve highlight',
        description: 'Which element is highlighted across the curve and its gradient graph',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.22)',
    },
    foundTurningLeft: {
        defaultValue: false,
        type: 'boolean',
        label: 'Left turning point found',
        description: 'True once the student has parked the point on the turning point at x = -1',
    },
    foundTurningRight: {
        defaultValue: false,
        type: 'boolean',
        label: 'Right turning point found',
        description: 'True once the student has parked the point on the turning point at x = 1',
    },
    turningPointX: {
        defaultValue: '',
        type: 'text',
        label: 'Turning point answer',
        description: 'Student answer for the turning points of y = 3x/(4+x^2)',
        placeholder: '???',
        correctAnswer: ['2', '+-2', '±2', '2 and -2', '2, -2'],
        color: '#8E90F5',
        bgColor: 'rgba(142, 144, 245, 0.15)',
    },

    // ─────────────────────────────────────────
    // SECTION: Building the Sign Table
    // ─────────────────────────────────────────
    signLeft: {
        defaultValue: '',
        type: 'text',
        label: 'Prediction for x < -1',
        description: 'Student prediction of the gradient sign left of x = -1 (rising or falling)',
    },
    signMiddle: {
        defaultValue: '',
        type: 'text',
        label: 'Prediction for -1 < x < 1',
        description: 'Student prediction of the gradient sign between the turning points',
    },
    signRight: {
        defaultValue: '',
        type: 'text',
        label: 'Prediction for x > 1',
        description: 'Student prediction of the gradient sign right of x = 1',
    },
    signTableHighlight: {
        defaultValue: '',
        type: 'text',
        label: 'Sign table highlight',
        description: 'Which part of the sign table figure is highlighted',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.22)',
    },
    signTableGradient: {
        defaultValue: '',
        type: 'select',
        label: 'Gradient sign answer',
        description: 'Student answer for the sign of the gradient between x = -2 and x = 2',
        placeholder: '???',
        options: ['positive', 'negative', 'zero'],
        correctAnswer: 'negative',
        color: '#8E90F5',
        bgColor: 'rgba(142, 144, 245, 0.15)',
    },
    signTableShape: {
        defaultValue: '',
        type: 'select',
        label: 'Curve shape answer',
        description: 'Student answer for what the curve does between the two turning points',
        placeholder: '???',
        options: ['rises', 'falls', 'stays flat'],
        correctAnswer: 'falls',
        color: '#8E90F5',
        bgColor: 'rgba(142, 144, 245, 0.15)',
    },

    // ─────────────────────────────────────────
    // SECTION: Where the Curve Changes Its Bend
    // ─────────────────────────────────────────
    bendX: {
        defaultValue: -3.2,
        type: 'number',
        label: 'x on the curve',
        description: 'Position of the draggable painting point along the curve',
        min: -4,
        max: 4,
        step: 0.05,
        color: '#62D0AD',
    },
    bendVisitedMin: {
        defaultValue: -3.2,
        type: 'number',
        label: 'Painted from',
        description: 'Smallest x the painting point has reached',
        min: -4,
        max: 4,
        step: 0.05,
    },
    bendVisitedMax: {
        defaultValue: -3.2,
        type: 'number',
        label: 'Painted to',
        description: 'Largest x the painting point has reached',
        min: -4,
        max: 4,
        step: 0.05,
    },
    bendHighlight: {
        defaultValue: '',
        type: 'text',
        label: 'Bend highlight',
        description: 'Which bend direction is highlighted in the painting figure',
        color: '#62D0AD',
        bgColor: 'rgba(98, 208, 173, 0.22)',
    },
    bendDirection: {
        defaultValue: '',
        type: 'select',
        label: 'Bend direction answer',
        description: 'Student answer for the bend direction at x = 1',
        placeholder: '???',
        options: ['upward', 'downward'],
        correctAnswer: 'downward',
        color: '#8E90F5',
        bgColor: 'rgba(142, 144, 245, 0.15)',
    },
    inflectionCount: {
        defaultValue: '',
        type: 'text',
        label: 'Inflection point count',
        description: 'Student answer for how many inflection points the curve has',
        placeholder: '???',
        correctAnswer: ['3', 'three'],
        color: '#8E90F5',
        bgColor: 'rgba(142, 144, 245, 0.15)',
    },
};

/**
 * Get all variable names (for AI agents to discover)
 */
export const getVariableNames = (): string[] => {
    return Object.keys(variableDefinitions);
};

/**
 * Get a variable's default value
 */
export const getDefaultValue = (name: string): VarValue => {
    return variableDefinitions[name]?.defaultValue ?? 0;
};

/**
 * Get a variable's metadata
 */
export const getVariableInfo = (name: string): VariableDefinition | undefined => {
    return variableDefinitions[name];
};

/**
 * Get all default values as a record (for initialization)
 */
export const getDefaultValues = (): Record<string, VarValue> => {
    const defaults: Record<string, VarValue> = {};
    for (const [name, def] of Object.entries(variableDefinitions)) {
        defaults[name] = def.defaultValue;
    }
    return defaults;
};

/**
 * Get number props for InlineScrubbleNumber from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
export function numberPropsFromDefinition(def: VariableDefinition | undefined): {
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    color?: string;
} {
    if (!def || def.type !== 'number') return {};
    return {
        defaultValue: def.defaultValue as number,
        min: def.min,
        max: def.max,
        step: def.step,
        ...(def.color ? { color: def.color } : {}),
    };
}

/**
 * Get cloze input props for InlineClozeInput from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
/**
 * Get cloze choice props for InlineClozeChoice from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function choicePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Get toggle props for InlineToggle from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function togglePropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

export function clozePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
    caseSensitive?: boolean;
} {
    if (!def || def.type !== 'text') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
        ...(def.caseSensitive !== undefined ? { caseSensitive: def.caseSensitive } : {}),
    };
}

/**
 * Get spot-color props for InlineSpotColor from a variable definition.
 * Extracts the `color` field.
 *
 * @example
 * <InlineSpotColor
 *     varName="radius"
 *     {...spotColorPropsFromDefinition(getVariableInfo('radius'))}
 * >
 *     radius
 * </InlineSpotColor>
 */
export function spotColorPropsFromDefinition(def: VariableDefinition | undefined): {
    color: string;
} {
    return {
        color: def?.color ?? '#8B5CF6',
    };
}

/**
 * Get linked-highlight props for InlineLinkedHighlight from a variable definition.
 * Extracts the `color` and `bgColor` fields.
 *
 * @example
 * <InlineLinkedHighlight
 *     varName="activeHighlight"
 *     highlightId="radius"
 *     {...linkedHighlightPropsFromDefinition(getVariableInfo('activeHighlight'))}
 * >
 *     radius
 * </InlineLinkedHighlight>
 */
export function linkedHighlightPropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    return {
        ...(def?.color ? { color: def.color } : {}),
        ...(def?.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Build the `variables` prop for FormulaBlock from variable definitions.
 *
 * Takes an array of variable names and returns the config map expected by
 * `<FormulaBlock variables={...} />`.
 *
 * @example
 * import { scrubVarsFromDefinitions } from './variables';
 *
 * <FormulaBlock
 *     latex="\scrub{mass} \times \scrub{accel}"
 *     variables={scrubVarsFromDefinitions(['mass', 'accel'])}
 * />
 */
export function scrubVarsFromDefinitions(
    varNames: string[],
): Record<string, { min?: number; max?: number; step?: number; color?: string }> {
    const result: Record<string, { min?: number; max?: number; step?: number; color?: string }> = {};
    for (const name of varNames) {
        const def = variableDefinitions[name];
        if (!def) continue;
        result[name] = {
            ...(def.min !== undefined ? { min: def.min } : {}),
            ...(def.max !== undefined ? { max: def.max } : {}),
            ...(def.step !== undefined ? { step: def.step } : {}),
            ...(def.color ? { color: def.color } : {}),
        };
    }
    return result;
}
