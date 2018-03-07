/*
 * Copyright (C) 2017 RedHat and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

export interface IExpression {
    [pattern: string]: boolean | SiblingClause | any;
}

export interface IRelativePattern {
    base: string;
    pattern: string;
    pathToRelative(from: string, to: string): string;
}

export interface SiblingClause {
    when: string;
}
export interface IGlobOptions {
    /**
	 * Simplify patterns for use as exclusion filters during tree traversal to skip entire subtrees. Cannot be used outside of a tree traversal.
	 */
    trimForExclusions?: boolean;
}

/**
 * Simplified glob matching. Supports a subset of glob patterns:
 * - * matches anything inside a path segment
 * - ? matches 1 character inside a path segment
 * - ** matches anything including an empty path segment
 * - simple brace expansion ({js,ts} => js or ts)
 * - character ranges (using [...])
 */
export function match(pattern: string | IRelativePattern, path: string): boolean;
export function match(pattern: string | IRelativePattern, path: string): boolean;
export function match(arg1: string | IExpression | IRelativePattern, path: string, siblingsFn?: () => string[]): any {
    if (!arg1 || !path) {
        return false;
    }

    // return parse(<IExpression>arg1)(path, undefined, siblingsFn);
    return new RegExp(<string>arg1).test(path);
}

// /**
//  * Simplified glob matching. Supports a subset of glob patterns:
//  * - * matches anything inside a path segment
//  * - ? matches 1 character inside a path segment
//  * - ** matches anything including an empty path segment
//  * - simple brace expansion ({js,ts} => js or ts)
//  * - character ranges (using [...])
//  */
// export function parse(pattern: string | IRelativePattern, options?: IGlobOptions): ParsedPattern;
// export function parse(expression: IExpression, options?: IGlobOptions): ParsedExpression;
// export function parse(arg1: string | IExpression | IRelativePattern, options: IGlobOptions = {}): any {
//     if (!arg1) {
//         return FALSE;
//     }

//     // Glob with String
//     if (typeof arg1 === 'string' || isRelativePattern(arg1)) {
//         const parsedPattern = parsePattern(arg1 as string | IRelativePattern, options);
//         if (parsedPattern === NULL) {
//             return FALSE;
//         }
//         const resultPattern = function (path: string, basename: string) {
//             return !!parsedPattern(path, basename);
//         };
//         if (parsedPattern.allBasenames) {
//             (<ParsedStringPattern><any>resultPattern).allBasenames = parsedPattern.allBasenames;
//         }
//         if (parsedPattern.allPaths) {
//             (<ParsedStringPattern><any>resultPattern).allPaths = parsedPattern.allPaths;
//         }
//         return resultPattern;
//     }

//     // Glob with Expression
//     return parsedExpression(<IExpression>arg1, options);
// }
