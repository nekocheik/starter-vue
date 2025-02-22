"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Node_js_1 = __importDefault(require("../nodes/node/Node.cjs"));
const PropertySymbol = __importStar(require("../PropertySymbol.cjs"));
const NodeFilterMask_js_1 = __importDefault(require("./NodeFilterMask.cjs"));
const DOMException_js_1 = __importDefault(require("../exception/DOMException.cjs"));
const NodeFilter_js_1 = __importDefault(require("./NodeFilter.cjs"));
/**
 * The TreeWalker object represents the nodes of a document subtree and a position within them.
 */
class TreeWalker {
    root = null;
    whatToShow = -1;
    filter = null;
    currentNode = null;
    /**
     * Constructor.
     *
     * @param root Root.
     * @param [whatToShow] What to show.
     * @param [filter] Filter.
     */
    constructor(root, whatToShow = -1, filter = null) {
        if (!(root instanceof Node_js_1.default)) {
            throw new DOMException_js_1.default('Parameter 1 was not of type Node.');
        }
        this.root = root;
        this.whatToShow = whatToShow;
        this.filter = filter;
        this.currentNode = root;
    }
    /**
     * Moves the current Node to the next visible node in the document order.
     *
     * @returns Current node.
     */
    nextNode() {
        if (!this.firstChild()) {
            while (!this.nextSibling() && this.parentNode()) { }
            this.currentNode = this.currentNode === this.root ? null : this.currentNode || null;
        }
        return this.currentNode;
    }
    /**
     * Moves the current Node to the previous visible node in the document order, and returns the found node. It also moves the current node to this one. If no such node exists, or if it is before that the root node defined at the object construction, returns null and the current node is not changed.
     *
     * @returns Current node.
     */
    previousNode() {
        while (!this.previousSibling() && this.parentNode()) { }
        this.currentNode = this.currentNode === this.root ? null : this.currentNode || null;
        return this.currentNode;
    }
    /**
     * Moves the current Node to the first visible ancestor node in the document order, and returns the found node. It also moves the current node to this one. If no such node exists, or if it is before that the root node defined at the object construction, returns null and the current node is not changed.
     *
     * @returns Current node.
     */
    parentNode() {
        if (this.currentNode !== this.root &&
            this.currentNode &&
            this.currentNode[PropertySymbol.parentNode]) {
            this.currentNode = this.currentNode[PropertySymbol.parentNode];
            if (this.filterNode(this.currentNode) === NodeFilter_js_1.default.FILTER_ACCEPT) {
                return this.currentNode;
            }
            this.parentNode();
        }
        this.currentNode = null;
        return null;
    }
    /**
     * Moves the current Node to the first visible child of the current node, and returns the found child. It also moves the current node to this child. If no such child exists, returns null and the current node is not changed.
     *
     * @returns Current node.
     */
    firstChild() {
        const childNodes = this.currentNode ? this.currentNode[PropertySymbol.nodeArray] : [];
        if (childNodes.length > 0) {
            this.currentNode = childNodes[0];
            if (this.filterNode(this.currentNode) === NodeFilter_js_1.default.FILTER_ACCEPT) {
                return this.currentNode;
            }
            return this.nextSibling();
        }
        return null;
    }
    /**
     * Moves the current Node to the last visible child of the current node, and returns the found child. It also moves the current node to this child. If no such child exists, null is returned and the current node is not changed.
     *
     * @returns Current node.
     */
    lastChild() {
        const childNodes = this.currentNode ? this.currentNode[PropertySymbol.nodeArray] : [];
        if (childNodes.length > 0) {
            this.currentNode = childNodes[childNodes.length - 1];
            if (this.filterNode(this.currentNode) === NodeFilter_js_1.default.FILTER_ACCEPT) {
                return this.currentNode;
            }
            return this.previousSibling();
        }
        return null;
    }
    /**
     * Moves the current Node to its previous sibling, if any, and returns the found sibling. If there is no such node, return null and the current node is not changed.
     *
     * @returns Current node.
     */
    previousSibling() {
        if (this.currentNode !== this.root &&
            this.currentNode &&
            this.currentNode[PropertySymbol.parentNode]) {
            const siblings = this.currentNode[PropertySymbol.parentNode][PropertySymbol.nodeArray];
            const index = siblings.indexOf(this.currentNode);
            if (index > 0) {
                this.currentNode = siblings[index - 1];
                if (this.filterNode(this.currentNode) === NodeFilter_js_1.default.FILTER_ACCEPT) {
                    return this.currentNode;
                }
                return this.previousSibling();
            }
        }
        return null;
    }
    /**
     * Moves the current Node to its next sibling, if any, and returns the found sibling. If there is no such node, null is returned and the current node is not changed.
     *
     * @returns Current node.
     */
    nextSibling() {
        if (this.currentNode !== this.root &&
            this.currentNode &&
            this.currentNode[PropertySymbol.parentNode]) {
            const siblings = this.currentNode[PropertySymbol.parentNode][PropertySymbol.nodeArray];
            const index = siblings.indexOf(this.currentNode);
            if (index + 1 < siblings.length) {
                this.currentNode = siblings[index + 1];
                if (this.filterNode(this.currentNode) === NodeFilter_js_1.default.FILTER_ACCEPT) {
                    return this.currentNode;
                }
                return this.nextSibling();
            }
        }
        return null;
    }
    /**
     * Filters a node.
     *
     * Based on solution:
     * https://gist.github.com/shawndumas/1132009.
     *
     * @param node Node.
     * @returns Child nodes.
     */
    filterNode(node) {
        const mask = NodeFilterMask_js_1.default[node.nodeType];
        if (mask && (this.whatToShow & mask) == 0) {
            return NodeFilter_js_1.default.FILTER_SKIP;
        }
        if (typeof this.filter === 'function') {
            return this.filter(node);
        }
        if (this.filter) {
            return this.filter.acceptNode(node);
        }
        return NodeFilter_js_1.default.FILTER_ACCEPT;
    }
}
exports.default = TreeWalker;
//# sourceMappingURL=TreeWalker.cjs.map