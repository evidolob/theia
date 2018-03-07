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

import { Disposable } from '@theia/core/lib/common/disposable';
import { ITokenizationRegistry, ITokenizationSupport, ITokenizationSupportChangedEvent, ColorId } from './modes';
import { Emitter, Event } from '@theia/core/lib/common';
import { Color } from './color';

export class TokenizationRegistryImpl implements ITokenizationRegistry {

    private _map: { [language: string]: ITokenizationSupport };

    private _onDidChange: Emitter<ITokenizationSupportChangedEvent> = new Emitter<ITokenizationSupportChangedEvent>();
    public onDidChange: Event<ITokenizationSupportChangedEvent> = this._onDidChange.event;

    private _colorMap: Color[];

    constructor() {
        this._map = Object.create(null);
        this._colorMap = [];
    }

    public fire(languages: string[]): void {
        this._onDidChange.fire({
            changedLanguages: languages,
            changedColorMap: false
        });
    }

    public register(language: string, support: ITokenizationSupport): Disposable {
        this._map[language] = support;
        this.fire([language]);
        return {
            dispose: () => {
                if (this._map[language] !== support) {
                    return;
                }
                delete this._map[language];
                this.fire([language]);
            }
        };
    }

    public get(language: string): ITokenizationSupport {
        return (this._map[language] || null);
    }

    public setColorMap(colorMap: Color[]): void {
        this._colorMap = colorMap;
        this._onDidChange.fire({
            changedLanguages: Object.keys(this._map),
            changedColorMap: true
        });
    }

    public getColorMap(): Color[] {
        return this._colorMap;
    }

    public getDefaultBackground(): Color {
        return this._colorMap[ColorId.DefaultBackground];
    }
}
