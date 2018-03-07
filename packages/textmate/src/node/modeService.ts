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

import { Event, Emitter } from '@theia/core/lib/common';
import { IMode, LanguageId, LanguageIdentifier } from '../common/modes';
import { LanguagesRegistry } from './languages-registry';
import { onUnexpectedError } from '../common/errors';

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

export interface IValidLanguageExtensionPoint {
    id: string;
    extensions: string[];
    filenames: string[];
    filenamePatterns: string[];
    firstLine: string;
    aliases: string[];
    mimetypes: string[];
    configuration: string;
}

export interface IModeService {
    _serviceBrand: any;

    onDidCreateMode: Event<IMode>;

    // --- reading
    isRegisteredMode(mimetypeOrModeId: string): boolean;
    getRegisteredModes(): string[];
    getRegisteredLanguageNames(): string[];
    getExtensions(alias: string): string[];
    getFilenames(alias: string): string[];
    getMimeForMode(modeId: string): string | null;
    getLanguageName(modeId: string): string | null;
    getModeIdForLanguageName(alias: string): string | null;
    getModeIdByFilenameOrFirstLine(filename: string, firstLine?: string): string | null;
    getModeId(commaSeparatedMimetypesOrCommaSeparatedIds: string): string | null;
    getLanguageIdentifier(modeId: string | LanguageId): LanguageIdentifier;
    getConfigurationFiles(modeId: string): string[];

    // --- instantiation
    getMode(commaSeparatedMimetypesOrCommaSeparatedIds: string): IMode | null;
    getOrCreateMode(commaSeparatedMimetypesOrCommaSeparatedIds: string): Promise<IMode>;
    getOrCreateModeByLanguageName(languageName: string): Promise<IMode>;
    getOrCreateModeByFilenameOrFirstLine(filename: string, firstLine?: string): Promise<IMode>;
}

export class ModeServiceImpl implements IModeService {
    public _serviceBrand: any;

    private readonly _instantiatedModes: { [modeId: string]: IMode; };
    private readonly _registry: LanguagesRegistry;

    private readonly _onDidCreateMode: Emitter<IMode> = new Emitter<IMode>();
    public readonly onDidCreateMode: Event<IMode> = this._onDidCreateMode.event;

    constructor(warnOnOverwrite = false) {
        this._instantiatedModes = {};

        this._registry = new LanguagesRegistry(true, warnOnOverwrite);
    }

    protected _onReady(): Promise<boolean> {
        return Promise.resolve(true);
    }

    public isRegisteredMode(mimetypeOrModeId: string): boolean {
        return this._registry.isRegisteredMode(mimetypeOrModeId);
    }

    public getRegisteredModes(): string[] {
        return this._registry.getRegisteredModes();
    }

    public getRegisteredLanguageNames(): string[] {
        return this._registry.getRegisteredLanguageNames();
    }

    public getExtensions(alias: string): string[] {
        return this._registry.getExtensions(alias);
    }

    public getFilenames(alias: string): string[] {
        return this._registry.getFilenames(alias);
    }

    public getMimeForMode(modeId: string): string | null {
        return this._registry.getMimeForMode(modeId);
    }

    public getLanguageName(modeId: string): string | null {
        return this._registry.getLanguageName(modeId);
    }

    public getModeIdForLanguageName(alias: string): string | null {
        return this._registry.getModeIdForLanguageNameLowercase(alias);
    }

    public getModeIdByFilenameOrFirstLine(filename: string, firstLine?: string): string | null {
        const modeIds = this._registry.getModeIdsFromFilenameOrFirstLine(filename, firstLine);

        if (modeIds.length > 0) {
            return modeIds[0];
        }

        return null;
    }

    public getModeId(commaSeparatedMimetypesOrCommaSeparatedIds: string): string | null {
        const modeIds = this._registry.extractModeIds(commaSeparatedMimetypesOrCommaSeparatedIds);

        if (modeIds.length > 0) {
            return modeIds[0];
        }

        return null;
    }

    public getLanguageIdentifier(modeId: string | LanguageId): LanguageIdentifier {
        return this._registry.getLanguageIdentifier(modeId);
    }

    public getConfigurationFiles(modeId: string): string[] {
        return this._registry.getConfigurationFiles(modeId);
    }

    // --- instantiation

    public getMode(commaSeparatedMimetypesOrCommaSeparatedIds: string): IMode | null {
        const modeIds = this._registry.extractModeIds(commaSeparatedMimetypesOrCommaSeparatedIds);

        let isPlainText = false;
        for (let i = 0; i < modeIds.length; i++) {
            if (this._instantiatedModes.hasOwnProperty(modeIds[i])) {
                return this._instantiatedModes[modeIds[i]];
            }
            isPlainText = isPlainText || (modeIds[i] === 'plaintext');
        }

        if (isPlainText) {
            // Try to do it synchronously
            let r: IMode | null = null;
            this.getOrCreateMode(commaSeparatedMimetypesOrCommaSeparatedIds).then((mode) => {
                r = mode;
            }).catch(onUnexpectedError);
            return r;
        }
        return null;
    }

    public getOrCreateMode(commaSeparatedMimetypesOrCommaSeparatedIds: string): Promise<IMode> {
        return this._onReady().then(() => {
            const modeId = this.getModeId(commaSeparatedMimetypesOrCommaSeparatedIds);
            // Fall back to plain text if no mode was found
            return this._getOrCreateMode(modeId || 'plaintext');
        });
    }

    public getOrCreateModeByLanguageName(languageName: string): Promise<IMode> {
        return this._onReady().then(() => {
            const modeId = this._getModeIdByLanguageName(languageName);
            // Fall back to plain text if no mode was found
            return this._getOrCreateMode(modeId || 'plaintext');
        });
    }

    private _getModeIdByLanguageName(languageName: string): string | null {
        const modeIds = this._registry.getModeIdsFromLanguageName(languageName);

        if (modeIds.length > 0) {
            return modeIds[0];
        }

        return null;
    }

    public getOrCreateModeByFilenameOrFirstLine(filename: string, firstLine?: string): Promise<IMode> {
        return this._onReady().then(() => {
            const modeId = this.getModeIdByFilenameOrFirstLine(filename, firstLine);
            // Fall back to plain text if no mode was found
            return this._getOrCreateMode(modeId || 'plaintext');
        });
    }

    private _getOrCreateMode(modeId: string): IMode {
        if (!this._instantiatedModes.hasOwnProperty(modeId)) {
            const languageIdentifier = this.getLanguageIdentifier(modeId);
            this._instantiatedModes[modeId] = new FrankensteinMode(languageIdentifier);

            this._onDidCreateMode.fire(this._instantiatedModes[modeId]);
        }
        return this._instantiatedModes[modeId];
    }
}

export class FrankensteinMode implements IMode {

    private _languageIdentifier: LanguageIdentifier;

    constructor(languageIdentifier: LanguageIdentifier) {
        this._languageIdentifier = languageIdentifier;
    }

    public getId(): string {
        return this._languageIdentifier.language;
    }

    public getLanguageIdentifier(): LanguageIdentifier {
        return this._languageIdentifier;
    }
}
