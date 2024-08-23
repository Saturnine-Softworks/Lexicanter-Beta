/**
 * Creates a Rust-like algebraic data type (ADT) with discriminated unions.
 * 
 * @template T - An object type where each key is a variant name and its value is the variant's data type.
 * @param {T} config - An object defining the structure of the ADT.
 * @returns {{
 *   type: DiscriminatedUnion<T>,
 *   constructor: {
 *     [P in keyof T]: ((value: T[P]) => DiscriminatedUnion<T>) & { default: DiscriminatedUnion<T> }
 *   }
 * }} An object containing the discriminated union type and constructor methods with default instances.
 * 
 * @example
 * const Result = ADT({
 *    Ok: { value: '' as string },
 *    Err: { error: '' as string }
 * });
 * type Result = typeof Result.type;
 * const Result = Result.constructor;
 * 
 * // Usage:
 * let result: Result = Result.Ok({ value: "success" });
 * console.log(Result.Err.default); // Default Err instance
 */
export default function ADT<T extends object>(config: T) {
    // Define the discriminated union type
    type DiscriminatedUnion<T extends object> = {
        [P in keyof T]: ({ tag: P } & (T[P] extends any[] ? { [K in number]: T[P][K] } : T[P])) extends infer U ? { [Q in keyof U]: U[Q] } : never
    }[keyof T]
    
    type Union = DiscriminatedUnion<T>;
    
    // Define the constructor type with default instances
    const constructor = {} as {
        [P in keyof T]: T[P] extends any[] ? ((...args: T[P]) => Union) & { default: Union } : ((value: T[P]) => Union) & { default: Union }
    };
    
    // Create constructor functions and default instances for each variant
    for (const prop in config) {
        const fn = ((...args: any[]) => {
            const result = { tag: prop } as any;
            if (Array.isArray(config[prop])) {
                args.forEach((arg, index) => {
                    result[index] = arg;
                });
            } else {
                result[prop] = args[0];
            }
            return result as Union;
        }) as any;
        
        // Create default instance using the config values
        fn.default = fn(...(Array.isArray(config[prop]) ? config[prop] : [config[prop]]));
        constructor[prop as keyof T] = fn;
    }
    
    return {
        type: {} as Union,
        constructor
    } as const;
}
