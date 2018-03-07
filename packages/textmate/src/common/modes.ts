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

import { Event } from '@theia/core/lib/common';
import { Disposable } from '@theia/core/lib/common/disposable';
import { TokenizationRegistryImpl } from './tokenizationRegistry';
import { Color } from './color';
/**
 * @internal
 */
export class LanguageIdentifier {

    /**
	 *A string identifier. Unique across languages. e.g. 'javascript'.
	 */
    public readonly language: string;

    /**
	 * A numeric identifier. Unique across languages. e.g. 5
	 * Will vary at runtime based on registration order, etc.
	 */
    public readonly id: LanguageId;

    constructor(language: string, id: LanguageId) {
        this.language = language;
        this.id = id;
    }
}

/**
 * A mode. Will soon be obsolete.
 * @internal
 */
export interface IMode {

    getId(): string;

    getLanguageIdentifier(): LanguageIdentifier;

}

export const enum LanguageId {
    Null = 0,
    PlainText = 1
}

/**
 * @internal
 */
export interface ITokenizationSupport {

    getInitialState(): IState;

    tokenize2(line: string, state: IState, offsetDelta: number): TokenizationResult2;
}

/**
 * The state of the tokenizer between two lines.
 * It is useful to store flags such as in multiline comment, etc.
 * The model will clone the previous line's state and pass it in to tokenize the next line.
 */
export interface IState {
    clone(): IState;
    equals(other: IState): boolean;
}
export class TokenizationResult2 {
    _tokenizationResult2Brand: void;

    /**
	 * The tokens in binary format. Each token occupies two array indices. For token i:
	 *  - at offset 2*i => startIndex
	 *  - at offset 2*i + 1 => metadata
	 *
	 */
    public readonly tokens: Uint32Array;
    public readonly endState: IState;

    constructor(tokens: Uint32Array, endState: IState) {
        this.tokens = tokens;
        this.endState = endState;
    }
}

/**
 * A font style. Values are 2^x such that a bit mask can be used.
 * @internal
 */
export const enum FontStyle {
    NotSet = -1,
    None = 0,
    Italic = 1,
    Bold = 2,
    Underline = 4
}

/**
 * Open ended enum at runtime
 * @internal
 */
export const enum ColorId {
    None = 0,
    DefaultForeground = 1,
    DefaultBackground = 2
}

/**
 * A standard token type. Values are 2^x such that a bit mask can be used.
 * @internal
 */
export const enum StandardTokenType {
    Other = 0,
    Comment = 1,
    String = 2,
    RegEx = 4
}

/**
 * Helpers to manage the "collapsed" metadata of an entire StackElement stack.
 * The following assumptions have been made:
 *  - languageId < 256 => needs 8 bits
 *  - unique color count < 512 => needs 9 bits
 *
 * The binary format is:
 * - -------------------------------------------
 *     3322 2222 2222 1111 1111 1100 0000 0000
 *     1098 7654 3210 9876 5432 1098 7654 3210
 * - -------------------------------------------
 *     xxxx xxxx xxxx xxxx xxxx xxxx xxxx xxxx
 *     bbbb bbbb bfff ffff ffFF FTTT LLLL LLLL
 * - -------------------------------------------
 *  - L = LanguageId (8 bits)
 *  - T = StandardTokenType (3 bits)
 *  - F = FontStyle (3 bits)
 *  - f = foreground color (9 bits)
 *  - b = background color (9 bits)
 *
 * @internal
 */
export const enum MetadataConsts {
    LANGUAGEID_MASK = 0b00000000000000000000000011111111,
    TOKEN_TYPE_MASK = 0b00000000000000000000011100000000,
    FONT_STYLE_MASK = 0b00000000000000000011100000000000,
    FOREGROUND_MASK = 0b00000000011111111100000000000000,
    BACKGROUND_MASK = 0b11111111100000000000000000000000,

    LANGUAGEID_OFFSET = 0,
    TOKEN_TYPE_OFFSET = 8,
    FONT_STYLE_OFFSET = 11,
    FOREGROUND_OFFSET = 14,
    BACKGROUND_OFFSET = 23
}

/**
 * @internal
 */
export class TokenMetadata {

    public static getLanguageId(metadata: number): LanguageId {
        return (metadata & MetadataConsts.LANGUAGEID_MASK) >>> MetadataConsts.LANGUAGEID_OFFSET;
    }

    public static getTokenType(metadata: number): StandardTokenType {
        return (metadata & MetadataConsts.TOKEN_TYPE_MASK) >>> MetadataConsts.TOKEN_TYPE_OFFSET;
    }

    public static getFontStyle(metadata: number): FontStyle {
        return (metadata & MetadataConsts.FONT_STYLE_MASK) >>> MetadataConsts.FONT_STYLE_OFFSET;
    }

    public static getForeground(metadata: number): ColorId {
        return (metadata & MetadataConsts.FOREGROUND_MASK) >>> MetadataConsts.FOREGROUND_OFFSET;
    }

    public static getBackground(metadata: number): ColorId {
        return (metadata & MetadataConsts.BACKGROUND_MASK) >>> MetadataConsts.BACKGROUND_OFFSET;
    }

    public static getClassNameFromMetadata(metadata: number): string {
        const foreground = this.getForeground(metadata);
        let className = 'mtk' + foreground;

        const fontStyle = this.getFontStyle(metadata);
        if (fontStyle & FontStyle.Italic) {
            className += ' mtki';
        }
        if (fontStyle & FontStyle.Bold) {
            className += ' mtkb';
        }
        if (fontStyle & FontStyle.Underline) {
            className += ' mtku';
        }

        return className;
    }

    public static getInlineStyleFromMetadata(metadata: number, colorMap: string[]): string {
        const foreground = this.getForeground(metadata);
        const fontStyle = this.getFontStyle(metadata);

        let result = `color: ${colorMap[foreground]};`;
        if (fontStyle & FontStyle.Italic) {
            result += 'font-style: italic;';
        }
        if (fontStyle & FontStyle.Bold) {
            result += 'font-weight: bold;';
        }
        if (fontStyle & FontStyle.Underline) {
            result += 'text-decoration: underline;';
        }
        return result;
    }
}

export const NULL_MODE_ID = 'vs.editor.nullMode';

export const NULL_LANGUAGE_IDENTIFIER = new LanguageIdentifier(NULL_MODE_ID, LanguageId.Null);

export function nullTokenize2(languageId: LanguageId, buffer: string, state: IState, deltaOffset: number): TokenizationResult2 {
    const tokens = new Uint32Array(2);
    tokens[0] = deltaOffset;
    tokens[1] = (
        (languageId << MetadataConsts.LANGUAGEID_OFFSET)
        | (StandardTokenType.Other << MetadataConsts.TOKEN_TYPE_OFFSET)
        | (FontStyle.None << MetadataConsts.FONT_STYLE_OFFSET)
        | (ColorId.DefaultForeground << MetadataConsts.FOREGROUND_OFFSET)
        | (ColorId.DefaultBackground << MetadataConsts.BACKGROUND_OFFSET)
    ) >>> 0;

    return new TokenizationResult2(tokens, state);
}

/**
 * @internal
 */
export interface ITokenizationSupportChangedEvent {
    changedLanguages: string[];
    changedColorMap: boolean;
}

/**
 * @internal
 */
export interface ITokenizationRegistry {

    /**
	 * An event triggered when:
	 *  - a tokenization support is registered, unregistered or changed.
	 *  - the color map is changed.
	 */
    onDidChange: Event<ITokenizationSupportChangedEvent>;

    /**
	 * Fire a change event for a language.
	 * This is useful for languages that embed other languages.
	 */
    fire(languages: string[]): void;

    /**
	 * Register a tokenization support.
	 */
    register(language: string, support: ITokenizationSupport): Disposable;

    /**
	 * Get the tokenization support for a language.
	 * Returns null if not found.
	 */
    get(language: string): ITokenizationSupport;

    /**
     * Set the new color map that all tokens will use in their ColorId binary encoded bits for foreground and background.
     */
    setColorMap(colorMap: Color[]): void;

    getColorMap(): Color[];

    getDefaultBackground(): Color;
}

/**
 * @internal
 */
export const TokenizationRegistry = new TokenizationRegistryImpl();
