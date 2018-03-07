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

import { LanguageIdentifier, LanguageId } from './modes';
import { Event, Emitter } from '@theia/core/lib/common';

export interface ILanguageExtensionPoint {
    id: string;
    extensions?: string[];
    filenames?: string[];
    filenamePatterns?: string[];
    firstLine?: string;
    aliases?: string[];
    mimetypes?: string[];
    configuration?: string;
}
export class EditorModesRegistry {

    private _languages: ILanguageExtensionPoint[];

    private _onDidAddLanguages: Emitter<ILanguageExtensionPoint[]> = new Emitter<ILanguageExtensionPoint[]>();
    public onDidAddLanguages: Event<ILanguageExtensionPoint[]> = this._onDidAddLanguages.event;

    constructor() {
        this._languages = [];
    }

    // --- languages

    public registerLanguage(def: ILanguageExtensionPoint): void {
        this._languages.push(def);
        this._onDidAddLanguages.fire([def]);
    }
    public registerLanguages(def: ILanguageExtensionPoint[]): void {
        this._languages = this._languages.concat(def);
        this._onDidAddLanguages.fire(def);
    }
    public getLanguages(): ILanguageExtensionPoint[] {
        return this._languages.slice(0);
    }
}

export const ModesRegistry = new EditorModesRegistry();

export const PLAINTEXT_MODE_ID = 'plaintext';
export const PLAINTEXT_LANGUAGE_IDENTIFIER = new LanguageIdentifier(PLAINTEXT_MODE_ID, LanguageId.PlainText);

ModesRegistry.registerLanguage({
    id: PLAINTEXT_MODE_ID,
    extensions: ['.txt', '.gitignore'],
    aliases: ["Plain Text", 'text'],
    mimetypes: ['text/plain']
});
