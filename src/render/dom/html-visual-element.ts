import { visualElement } from ".."
import { ResolvedValues } from "../types"
import { DOMVisualElementOptions, HTMLMutableState } from "./types"
import { buildHTMLStyles } from "./utils/build-html-styles"
import { isCSSVariable } from "./utils/is-css-variable"
import { isTransformProp } from "./utils/transform"
import { getDefaultValueType } from "./utils/value-types"

function getComputedStyle(element: HTMLElement) {
    return window.getComputedStyle(element)
}

export const htmlVisualElement = visualElement<HTMLElement, HTMLMutableState>({
    readNativeValue(domElement, key) {
        if (isTransformProp(key)) {
            return getDefaultValueType(key)?.default || 0
        } else {
            return (
                (isCSSVariable(key)
                    ? getComputedStyle(domElement).getPropertyValue(key)
                    : getComputedStyle(domElement)[key]) || 0
            )
        }
    },

    initMutableState: () => ({
        style: {},
        transform: {},
        transformKeys: [],
        transformOrigin: {},
        vars: {},
    }),

    /**
     * Reset the transform on the current Element. This is called as part
     * of a batched process across the entire layout tree. To remove this write
     * cycle it'd be interesting to see if it's possible to "undo" all the current
     * layout transforms up the tree in the same way this.getBoundingBoxWithoutTransforms
     * works
     */
    resetTransform(element, domElement, options) {
        /**
         * When we reset the transform of an element, there's a fair possibility that
         * the element will visually move from underneath the pointer, triggering attached
         * pointerenter/leave events. We temporarily suspend these while measurement takes place.
         */
        element.suspendHoverEvents()

        const { transformTemplate } = options
        domElement.style.transform = transformTemplate
            ? transformTemplate({}, "")
            : "none"

        // Ensure that whatever happens next, we restore our transform on the next frame
        element.scheduleRender()
    },

    restoreTransform(instance, mutableState) {
        instance.style.transform = mutableState.style.transform as string
    },

    onRemoveValue(key, { vars, style }) {
        delete vars[key]
        delete style[key]
    },

    build(latest, mutableState, projection, options) {
        // if (isVisible !== undefined) {
        //     mutableState.style.visibility = isVisible ? "visible" : "hidden"
        // }

        buildHTMLStyles(mutableState, latest, projection, options)
    },

    render(element, { style, vars }) {
        // Directly assign style into the Element's style prop. In tests Object.assign is the
        // fastest way to assign styles.
        Object.assign(element.style, style)

        // Loop over any CSS variables and assign those.
        for (const key in vars) {
            element.style.setProperty(key, vars[key] as string)
        }
    },
})