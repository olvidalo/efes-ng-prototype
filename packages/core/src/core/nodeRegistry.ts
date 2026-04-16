import type { DescribedNode } from './nodeConfigSchema';

class NodeRegistry {
    private byName = new Map<string, DescribedNode>();
    private byClass = new Map<DescribedNode, string>();

    register(name: string, nodeClass: DescribedNode): void {
        if (this.byName.has(name)) {
            throw new Error(`Duplicate node type name "${name}" — already registered by another node class.`);
        }
        this.byName.set(name, nodeClass);
        this.byClass.set(nodeClass, name);
    }

    get(name: string): DescribedNode | undefined {
        return this.byName.get(name);
    }

    /** Reverse lookup: get the registered name for a node class. */
    nameOf(nodeClass: DescribedNode): string | undefined {
        return this.byClass.get(nodeClass);
    }

    /** All registered type names. */
    names(): string[] {
        return [...this.byName.keys()];
    }

    /** All registered entries as [name, nodeClass] pairs. */
    all(): [string, DescribedNode][] {
        return [...this.byName.entries()];
    }
}

export const nodeRegistry = new NodeRegistry();
