import type { XmlRegistrableNode } from './nodeConfigSchema';

class NodeRegistryImpl {
    private byElement = new Map<string, XmlRegistrableNode>();

    register(nodeClass: XmlRegistrableNode): void {
        const name = nodeClass.xmlElement;
        if (this.byElement.has(name)) {
            throw new Error(`Duplicate XML element name "${name}" — already registered by another node class.`);
        }
        this.byElement.set(name, nodeClass);
    }

    get(elementName: string): XmlRegistrableNode | undefined {
        return this.byElement.get(elementName);
    }

    /** All registered element names (for "did you mean?" suggestions). */
    elementNames(): string[] {
        return [...this.byElement.keys()];
    }
}

export const NodeRegistry = new NodeRegistryImpl();
