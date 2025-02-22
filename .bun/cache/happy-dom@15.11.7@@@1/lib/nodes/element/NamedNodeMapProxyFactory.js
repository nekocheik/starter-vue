/* eslint-disable filenames/match-exported */
import ClassMethodBinder from '../../ClassMethodBinder.js';
import * as PropertySymbol from '../../PropertySymbol.js';
import NamedNodeMap from './NamedNodeMap.js';
/**
 * Named Node Map.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/NamedNodeMap
 */
export default class NamedNodeMapProxyFactory {
    /**
     * Constructor.
     *
     * @param namedNodeMap
     */
    static createProxy(namedNodeMap) {
        const namedItems = namedNodeMap[PropertySymbol.namedItems];
        const namespaceItems = namedNodeMap[PropertySymbol.namespaceItems];
        const methodBinder = new ClassMethodBinder(this, [NamedNodeMap]);
        return new Proxy(namedNodeMap, {
            get: (target, property) => {
                if (property === 'length') {
                    return namespaceItems.size;
                }
                if (property in target || typeof property === 'symbol') {
                    methodBinder.bind(property);
                    return target[property];
                }
                const index = Number(property);
                if (!isNaN(index)) {
                    return Array.from(namespaceItems.values())[index];
                }
                return target.getNamedItem(property) || undefined;
            },
            set(target, property, newValue) {
                methodBinder.bind(property);
                if (typeof property === 'symbol') {
                    target[property] = newValue;
                    return true;
                }
                const index = Number(property);
                if (isNaN(index)) {
                    target[property] = newValue;
                }
                return true;
            },
            deleteProperty(target, property) {
                if (typeof property === 'symbol') {
                    delete target[property];
                    return true;
                }
                const index = Number(property);
                if (isNaN(index)) {
                    delete target[property];
                }
                return true;
            },
            ownKeys() {
                const keys = Array.from(namedItems.keys());
                for (let i = 0, max = namespaceItems.size; i < max; i++) {
                    keys.push(String(i));
                }
                return keys;
            },
            has(target, property) {
                if (typeof property === 'symbol') {
                    return false;
                }
                if (property in target || namedItems.has(property)) {
                    return true;
                }
                const index = Number(property);
                if (!isNaN(index) && index >= 0 && index < namespaceItems.size) {
                    return true;
                }
                return false;
            },
            defineProperty(target, property, descriptor) {
                methodBinder.preventBinding(property);
                if (property in target) {
                    Object.defineProperty(target, property, descriptor);
                    return true;
                }
                return false;
            },
            getOwnPropertyDescriptor(target, property) {
                if (property in target || typeof property === 'symbol') {
                    return;
                }
                const index = Number(property);
                if (!isNaN(index) && index >= 0 && index < namespaceItems.size) {
                    return {
                        value: Array.from(namespaceItems.values())[index],
                        writable: false,
                        enumerable: true,
                        configurable: true
                    };
                }
                const namedItem = target.getNamedItem(property);
                if (namedItem) {
                    return {
                        value: namedItem,
                        writable: false,
                        enumerable: true,
                        configurable: true
                    };
                }
            }
        });
    }
}
//# sourceMappingURL=NamedNodeMapProxyFactory.js.map