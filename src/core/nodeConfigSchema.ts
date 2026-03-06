import type { PipelineNode } from './pipelineNode';
import type { Input } from './pipelineNode';

// --- Schema field types ---

export type SchemaFieldType = 'input' | 'scalar' | 'boolean' | 'number' | 'map' | 'array';

export interface SchemaField {
    readonly type: SchemaFieldType;
    readonly optional?: true;
    readonly description?: string;
}

export type NodeConfigSchema = Readonly<Record<string, SchemaField>>;

// --- Mapped type: derive TypeScript config type from schema ---

type FieldTypeMap = {
    input: Input;
    scalar: string;
    boolean: boolean;
    number: number;
    map: Record<string, any>;
    array: string[];
};

export type ConfigFromSchema<S extends NodeConfigSchema> = {
    -readonly [K in keyof S as S[K] extends { optional: true } ? never : K]: FieldTypeMap[S[K]['type']];
} & {
    -readonly [K in keyof S as S[K] extends { optional: true } ? K : never]?: FieldTypeMap[S[K]['type']];
};

// --- Interface for nodes that can be loaded from XML ---

export interface XmlRegistrableNode {
    readonly xmlElement: string;
    readonly configSchema: NodeConfigSchema;
    readonly outputKeys: readonly string[];
    readonly description?: string;
    new (config: any): PipelineNode<any, any>;
}
