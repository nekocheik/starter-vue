import Element from '../element/Element.cjs';
import * as PropertySymbol from '../../PropertySymbol.cjs';
import CSSStyleDeclaration from '../../css/declaration/CSSStyleDeclaration.cjs';
import Event from '../../event/Event.cjs';
import DOMStringMap from '../../dom/DOMStringMap.cjs';
/**
 * HTML Element.
 *
 * Reference:
 * https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement.
 */
export default class HTMLElement extends Element {
    #private;
    cloneNode: (deep?: boolean) => HTMLElement;
    oncopy: (event: Event) => void | null;
    oncut: (event: Event) => void | null;
    onpaste: (event: Event) => void | null;
    oninvalid: (event: Event) => void | null;
    onanimationcancel: (event: Event) => void | null;
    onanimationend: (event: Event) => void | null;
    onanimationiteration: (event: Event) => void | null;
    onanimationstart: (event: Event) => void | null;
    onbeforeinput: (event: Event) => void | null;
    oninput: (event: Event) => void | null;
    onchange: (event: Event) => void | null;
    ongotpointercapture: (event: Event) => void | null;
    onlostpointercapture: (event: Event) => void | null;
    onpointercancel: (event: Event) => void | null;
    onpointerdown: (event: Event) => void | null;
    onpointerenter: (event: Event) => void | null;
    onpointerleave: (event: Event) => void | null;
    onpointermove: (event: Event) => void | null;
    onpointerout: (event: Event) => void | null;
    onpointerover: (event: Event) => void | null;
    onpointerup: (event: Event) => void | null;
    ontransitioncancel: (event: Event) => void | null;
    ontransitionend: (event: Event) => void | null;
    ontransitionrun: (event: Event) => void | null;
    ontransitionstart: (event: Event) => void | null;
    [PropertySymbol.accessKey]: string;
    [PropertySymbol.contentEditable]: string;
    [PropertySymbol.isContentEditable]: boolean;
    [PropertySymbol.offsetHeight]: number;
    [PropertySymbol.offsetWidth]: number;
    [PropertySymbol.offsetLeft]: number;
    [PropertySymbol.offsetTop]: number;
    [PropertySymbol.clientHeight]: number;
    [PropertySymbol.clientWidth]: number;
    [PropertySymbol.clientLeft]: number;
    [PropertySymbol.clientTop]: number;
    [PropertySymbol.style]: CSSStyleDeclaration;
    [PropertySymbol.dataset]: DOMStringMap | null;
    /**
     * Returns access key.
     *
     * @returns Access key.
     */
    get accessKey(): string;
    /**
     * Sets access key.
     *
     * @param accessKey Access key.
     */
    set accessKey(accessKey: string);
    /**
     * Returns content editable.
     *
     * @returns Content editable.
     */
    get contentEditable(): string;
    /**
     * Sets content editable.
     *
     * @param contentEditable Content editable.
     */
    set contentEditable(contentEditable: string);
    /**
     * Returns is content editable.
     *
     * @returns Is content editable.
     */
    get isContentEditable(): boolean;
    /**
     * Returns offset height.
     *
     * @returns Offset height.
     */
    get offsetHeight(): number;
    /**
     * Returns offset width.
     *
     * @returns Offset width.
     */
    get offsetWidth(): number;
    /**
     * Returns offset left.
     *
     * @returns Offset left.
     */
    get offsetLeft(): number;
    /**
     * Returns offset top.
     *
     * @returns Offset top.
     */
    get offsetTop(): number;
    /**
     * Returns client height.
     *
     * @returns Client height.
     */
    get clientHeight(): number;
    /**
     * Returns client width.
     *
     * @returns Client width.
     */
    get clientWidth(): number;
    /**
     * Returns client left.
     *
     * @returns Client left.
     */
    get clientLeft(): number;
    /**
     * Returns client top.
     *
     * @returns Client top.
     */
    get clientTop(): number;
    /**
     * Returns tab index.
     *
     * @returns Tab index.
     */
    get tabIndex(): number;
    /**
     * Returns tab index.
     *
     * @param tabIndex Tab index.
     */
    set tabIndex(tabIndex: number);
    /**
     * Returns inner text, which is the rendered appearance of text.
     *
     * @see https://html.spec.whatwg.org/multipage/dom.html#the-innertext-idl-attribute
     * @returns Inner text.
     */
    get innerText(): string;
    /**
     * Sets the inner text, which is the rendered appearance of text.
     *
     * @see https://html.spec.whatwg.org/multipage/dom.html#the-innertext-idl-attribute
     * @param innerText Inner text.
     */
    set innerText(text: string);
    /**
     * Returns outer text.
     *
     * @see https://html.spec.whatwg.org/multipage/dom.html#the-innertext-idl-attribute
     * @returns HTML.
     */
    get outerText(): string;
    /**
     * Sets outer text.
     *
     * @see https://html.spec.whatwg.org/multipage/dom.html#the-innertext-idl-attribute
     * @param text Text.
     */
    set outerText(text: string);
    /**
     * Returns style.
     *
     * @returns Style.
     */
    get style(): CSSStyleDeclaration;
    /**
     * Sets style.
     *
     * @param cssText Style as text.
     * @see https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/style#setting_styles
     */
    set style(cssText: string | CSSStyleDeclaration | null);
    /**
     * Returns data set.
     *
     * @returns Data set.
     */
    get dataset(): DOMStringMap;
    /**
     * Returns direction.
     *
     * @returns Direction.
     */
    get dir(): string;
    /**
     * Returns direction.
     *
     * @param direction Direction.
     */
    set dir(direction: string);
    /**
     * Returns hidden.
     *
     * @returns Hidden.
     */
    get hidden(): boolean;
    /**
     * Returns hidden.
     *
     * @param hidden Hidden.
     */
    set hidden(hidden: boolean);
    /**
     * Returns inert.
     *
     * @returns Inert.
     */
    get inert(): boolean;
    /**
     * Returns inert.
     *
     * @param inert Inert.
     */
    set inert(inert: boolean);
    /**
     * Returns language.
     *
     * @returns Language.
     */
    get lang(): string;
    /**
     * Returns language.
     *
     * @param language Language.
     */
    set lang(lang: string);
    /**
     * Returns title.
     *
     * @returns Title.
     */
    get title(): string;
    /**
     * Returns title.
     *
     * @param title Title.
     */
    set title(title: string);
    /**
     * Returns popover.
     *
     * @returns Popover.
     */
    get popover(): string | null;
    /**
     * Sets popover.
     *
     * @param value Value.
     */
    set popover(value: string | null);
    /**
     * Triggers a click event.
     */
    click(): void;
    /**
     * Triggers a blur event.
     */
    blur(): void;
    /**
     * Triggers a focus event.
     */
    focus(): void;
    /**
     * @override
     */
    [PropertySymbol.cloneNode](deep?: boolean): HTMLElement;
    /**
     * @override
     * @see https://html.spec.whatwg.org/multipage/dom.html#htmlelement
     */
    [PropertySymbol.connectedToNode](): void;
    /**
     * @override
     */
    [PropertySymbol.disconnectedFromNode](): void;
}
//# sourceMappingURL=HTMLElement.d.ts.map