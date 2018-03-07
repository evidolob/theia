/*
 * Copyright (C) 2017 RedHat and others.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 */
import { FrontendApplicationContribution } from "@theia/core/lib/browser";
import { inject, injectable } from 'inversify';
import { TextMateColorizer } from './textmate-colorizer';

@injectable()
export class TextMateFrontendContribution implements FrontendApplicationContribution {
    private _styleElement: HTMLStyleElement;

    constructor( @inject(TextMateColorizer) private colorizer: TextMateColorizer) {
        this._styleElement = this.createStyleSheet();
        this._styleElement.className = 'vscode-tokens-styles';
    }
    private createStyleSheet(container: HTMLElement = document.getElementsByTagName('head')[0]): HTMLStyleElement {
        const style = document.createElement('style');
        style.type = 'text/css';
        style.media = 'screen';
        container.appendChild(style);
        return style;
    }
    onStart() {
        console.log("On Start!", this.colorizer);
        this._styleElement.innerHTML = `  .mtk1 { color: #d4d4d4; }
        .mtk2 { color: #1e1e1e; }
        .mtk3 { color: #6796e6; }
        .mtk4 { color: #608b4e; }
        .mtk5 { color: #569cd6; }
        .mtk6 { color: #d16969; }
        .mtk7 { color: #d7ba7d; }
        .mtk8 { color: #b5cea8; }
        .mtk9 { color: #ce9178; }
        .mtk10 { color: #646695; }
        .mtk11 { color: #4ec9b0; }
        .mtk12 { color: #dcdcaa; }
        .mtk13 { color: #9cdcfe; }
        .mtk14 { color: #000080; }
        .mtk15 { color: #f44747; }
        .mtk16 { color: #c586c0; }
        .mtk17 { color: #d4d4d4; }
        .mtk18 { color: #808080; }
        .mtk19 { color: #b267e6; }
        .mtk20 { color: #cd9731; }
        .mtki { font-style: italic; }
        .mtkb { font-weight: bold; }
        .mtku { text-decoration: underline; }`;
    }
}
