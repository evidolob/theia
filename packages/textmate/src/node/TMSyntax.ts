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

import { join, normalize } from 'path';
import { ITokenizationSupport, IState, TokenizationResult2, LanguageId, TokenMetadata, nullTokenize2, TokenizationRegistry } from '../common/modes';
import { StackElement, IGrammar, Registry, IEmbeddedLanguagesMap as IEmbeddedLanguagesMap2, IRawThemeSetting } from 'vscode-textmate';
import { Emitter, Event } from '@theia/core/lib/common';
import { onUnexpectedError } from '../common/errors';
import { IModeService } from './modeService';
import { Color } from '../common/color';

export class TMScopeRegistry {

    private _scopeNameToLanguageRegistration: { [scopeName: string]: TMLanguageRegistration; };
    private _encounteredLanguages: boolean[];

    private _onDidEncounterLanguage = new Emitter<LanguageId>();
    public onDidEncounterLanguage: Event<LanguageId> = this._onDidEncounterLanguage.event;

    constructor() {
        this._scopeNameToLanguageRegistration = Object.create(null);
        this._encounteredLanguages = [];
    }

    public register(scopeName: string, filePath: string, embeddedLanguages?: IEmbeddedLanguagesMap): void {
        this._scopeNameToLanguageRegistration[scopeName] = new TMLanguageRegistration(scopeName, filePath, embeddedLanguages);
    }

    public getLanguageRegistration(scopeName: string): TMLanguageRegistration {
        return this._scopeNameToLanguageRegistration[scopeName] || null;
    }

    public getFilePath(scopeName: string): string {
        const data = this.getLanguageRegistration(scopeName);
        return data ? data.grammarFilePath : '';
    }

    /**
     * To be called when tokenization found/hit an embedded language.
     */
    public onEncounteredLanguage(languageId: LanguageId): void {
        if (!this._encounteredLanguages[languageId]) {
            this._encounteredLanguages[languageId] = true;
            this._onDidEncounterLanguage.fire(languageId);
        }
    }
}
export interface IEmbeddedLanguagesMap {
    [scopeName: string]: string;
}

export class TMLanguageRegistration {
    _topLevelScopeNameDataBrand: void;

    readonly scopeName: string;
    readonly grammarFilePath: string;
    readonly embeddedLanguages: IEmbeddedLanguagesMap;

    constructor(scopeName: string, grammarFilePath: string, embeddedLanguages: IEmbeddedLanguagesMap | undefined) {
        this.scopeName = scopeName;
        this.grammarFilePath = grammarFilePath;

        // embeddedLanguages handling
        this.embeddedLanguages = Object.create(null);

        if (embeddedLanguages) {
            // If embeddedLanguages are configured, fill in `this._embeddedLanguages`
            const scopes = Object.keys(embeddedLanguages);
            for (let i = 0, len = scopes.length; i < len; i++) {
                const scope = scopes[i];
                const language = embeddedLanguages[scope];
                if (typeof language !== 'string') {
                    // never hurts to be too careful
                    continue;
                }
                this.embeddedLanguages[scope] = language;
            }
        }
    }
}

interface ICreateGrammarResult {
    languageId: LanguageId;
    grammar: IGrammar;
    initialState: StackElement;
    containsEmbeddedLanguages: boolean;
}

export interface ITextMateService {
    _serviceBrand: {};

    onDidEncounterLanguage: Event<LanguageId>;

    createGrammar(modeId: string): Promise<IGrammar>;
}

export interface ITMSyntaxExtensionPoint {
    language: string;
    scopeName: string;
    path: string;
    embeddedLanguages?: IEmbeddedLanguagesMap;
    injectTo?: string[];
}

export class TextMateService implements ITextMateService {
    public _serviceBrand: any;

    private _grammarRegistry: Promise<[Registry, StackElement]> | undefined;
    private _modeService: IModeService;
    // private _themeService: IWorkbenchThemeService;
    private _scopeRegistry: TMScopeRegistry;
    private _injections: { [scopeName: string]: string[]; };
    private _injectedEmbeddedLanguages: { [scopeName: string]: IEmbeddedLanguagesMap[]; };

    private _languageToScope: Map<string, string>;
    // private _styleElement: HTMLStyleElement;

    // private _currentTokenColors: ITokenColorizationRule[];

    public onDidEncounterLanguage: Event<LanguageId>;

    constructor(
        modeService: IModeService,
        // @IWorkbenchThemeService themeService: IWorkbenchThemeService
    ) {
        // this._styleElement = dom.createStyleSheet();
        // this._styleElement.className = 'vscode-tokens-styles';
        this._modeService = modeService;
        // this._themeService = themeService;
        this._scopeRegistry = new TMScopeRegistry();
        this.onDidEncounterLanguage = this._scopeRegistry.onDidEncounterLanguage;
        this._injections = {};
        this._injectedEmbeddedLanguages = {};
        this._languageToScope = new Map<string, string>();

        this._grammarRegistry = undefined;

        // grammarsExtPoint.setHandler(extensions => {
        //     for (let i = 0; i < extensions.length; i++) {
        //         let grammars = extensions[i].value;
        //         for (let j = 0; j < grammars.length; j++) {
        //             this._handleGrammarExtensionPointUser(extensions[i].description.extensionFolderPath, grammars[j], extensions[i].collector);
        //         }
        //     }
        // });
        this._handleGrammarExtensionPointUser(__dirname, {
            language: "typescript",
            scopeName: "source.ts",
            path: "./TypeScript.tmLanguage.json"
        });

        // // Generate some color map until the grammar registry is loaded
        // let colorTheme = this._themeService.getColorTheme();
        // const defaultForeground: Color = Color.red;
        // const defaultBackground: Color = Color.transparent;
        // for (let i = 0, len = colorTheme.tokenColors.length; i < len; i++) {
        //     let rule = colorTheme.tokenColors[i];
        //     if (!rule.scope) {
        //         if (rule.settings.foreground) {
        //             defaultForeground = Color.fromHex(rule.settings.foreground);
        //         }
        //         if (rule.settings.background) {
        //             defaultBackground = Color.fromHex(rule.settings.background);
        //         }
        //     }
        // }
        // TokenizationRegistry.setColorMap([null, defaultForeground, defaultBackground]);

        this._modeService.onDidCreateMode((mode) => {
            const modeId = mode.getId();
            if (this._languageToScope.has(modeId)) {
                this.registerDefinition(modeId);
            }
        });
    }

    private _getOrCreateGrammarRegistry(): Promise<[Registry, StackElement]> {
        if (!this._grammarRegistry) {
            this._grammarRegistry = Promise.resolve(import('vscode-textmate')).then(({ Registry, INITIAL }) => {
                const grammarRegistry = new Registry({
                    getFilePath: (scopeName: string) =>
                        this._scopeRegistry.getFilePath(scopeName),
                    getInjections: (scopeName: string) =>
                        this._injections[scopeName]
                });
                this._updateTheme(grammarRegistry);
                // this._themeService.onDidColorThemeChange((e) => this._updateTheme(grammarRegistry));
                return <[Registry, StackElement]>[grammarRegistry, INITIAL];
            });
        }

        return this._grammarRegistry;
    }

    private static _toColorMap(colorMap: string[]): Color[] {
        const result: Color[] = [];
        for (let i = 1, len = colorMap.length; i < len; i++) {
            result[i] = Color.fromHex(colorMap[i]);
        }
        return result;
    }

    private _updateTheme(grammarRegistry: Registry): void {
        // let colorTheme = this._themeService.getColorTheme();
        // if (!this.compareTokenRules(colorTheme.tokenColors)) {
        //     return;
        // }
        const tokenColors: IRawThemeSetting[] = [{ "settings": { "foreground": "#d4d4d4ff", "background": "#1e1e1eff" } },
        { "scope": ["meta.embedded", "source.groovy.embedded"], "settings": { "foreground": "#D4D4D4" } },
        { "scope": "emphasis", "settings": { "fontStyle": "italic" } },
        { "scope": "strong", "settings": { "fontStyle": "bold" } },
        { "scope": "header", "settings": { "foreground": "#000080" } },
        { "scope": "comment", "settings": { "foreground": "#608b4e" } },
        { "scope": "constant.language", "settings": { "foreground": "#569cd6" } },
        { "scope": ["constant.numeric"], "settings": { "foreground": "#b5cea8" } },
        { "scope": "constant.regexp", "settings": { "foreground": "#646695" } },
        { "scope": "entity.name.tag", "settings": { "foreground": "#569cd6" } },
        { "scope": "entity.name.tag.css", "settings": { "foreground": "#d7ba7d" } },
        { "scope": "entity.other.attribute-name", "settings": { "foreground": "#9cdcfe" } },
        {
            "scope": ["entity.other.attribute-name.class.css", "entity.other.attribute-name.class.mixin.css", "entity.other.attribute-name.id.css",
                "entity.other.attribute-name.parent-selector.css", "entity.other.attribute-name.pseudo-class.css",
                "entity.other.attribute-name.pseudo-element.css", "source.css.less entity.other.attribute-name.id",
                "entity.other.attribute-name.attribute.scss", "entity.other.attribute-name.scss"], "settings": { "foreground": "#d7ba7d" }
        },
        { "scope": "invalid", "settings": { "foreground": "#f44747" } },
        { "scope": "markup.underline", "settings": { "fontStyle": "underline" } },
        { "scope": "markup.bold", "settings": { "fontStyle": "bold", "foreground": "#569cd6" } },
        { "scope": "markup.heading", "settings": { "fontStyle": "bold", "foreground": "#569cd6" } },
        { "scope": "markup.italic", "settings": { "fontStyle": "italic" } }, { "scope": "markup.inserted", "settings": { "foreground": "#b5cea8" } },
        { "scope": "markup.deleted", "settings": { "foreground": "#ce9178" } }, { "scope": "markup.changed", "settings": { "foreground": "#569cd6" } },
        { "scope": "beginning.punctuation.definition.quote.markdown", "settings": { "foreground": "#608b4e" } },
        { "scope": "beginning.punctuation.definition.list.markdown", "settings": { "foreground": "#6796e6" } },
        { "scope": "markup.inline.raw", "settings": { "foreground": "#ce9178" } },
        { "scope": "meta.selector", "settings": { "foreground": "#d7ba7d" } }, {
            "name": "brackets of XML/HTML tags",
            "scope": "punctuation.definition.tag", "settings": { "foreground": "#808080" }
        },
        { "scope": "meta.preprocessor", "settings": { "foreground": "#569cd6" } },
        { "scope": "meta.preprocessor.string", "settings": { "foreground": "#ce9178" } },
        { "scope": "meta.preprocessor.numeric", "settings": { "foreground": "#b5cea8" } },
        { "scope": "meta.structure.dictionary.key.python", "settings": { "foreground": "#9cdcfe" } },
        { "scope": "meta.diff.header", "settings": { "foreground": "#569cd6" } },
        { "scope": "storage", "settings": { "foreground": "#569cd6" } },
        { "scope": "storage.type", "settings": { "foreground": "#569cd6" } },
        { "scope": "storage.modifier", "settings": { "foreground": "#569cd6" } },
        { "scope": "string", "settings": { "foreground": "#ce9178" } },
        { "scope": "string.tag", "settings": { "foreground": "#ce9178" } },
        { "scope": "string.value", "settings": { "foreground": "#ce9178" } },
        { "scope": "string.regexp", "settings": { "foreground": "#d16969" } },
        {
            "name": "String interpolation", "scope": ["punctuation.definition.template-expression.begin",
                "punctuation.definition.template-expression.end", "punctuation.section.embedded"], "settings": { "foreground": "#569cd6" }
        },
        {
            "name": "Reset JavaScript string interpolation expression",
            "scope": ["meta.template.expression"], "settings": { "foreground": "#d4d4d4" }
        }, {
            "scope": ["support.type.vendored.property-name", "support.type.property-name", "variable.css", "variable.scss",
                "variable.other.less", "source.coffee.embedded"], "settings": { "foreground": "#9cdcfe" }
        },
        { "scope": "keyword", "settings": { "foreground": "#569cd6" } }, { "scope": "keyword.control", "settings": { "foreground": "#569cd6" } },
        { "scope": "keyword.operator", "settings": { "foreground": "#d4d4d4" } },
        {
            "scope": ["keyword.operator.new", "keyword.operator.expression", "keyword.operator.cast", "keyword.operator.sizeof",
                "keyword.operator.logical.python"], "settings": { "foreground": "#569cd6" }
        },
        { "scope": "keyword.other.unit", "settings": { "foreground": "#b5cea8" } },
        {
            "scope": ["punctuation.section.embedded.begin.php", "punctuation.section.embedded.end.php"],
            "settings": { "foreground": "#569cd6" }
        }, { "scope": "support.function.git-rebase", "settings": { "foreground": "#9cdcfe" } },
        { "scope": "constant.sha.git-rebase", "settings": { "foreground": "#b5cea8" } },
        {
            "name": "coloring of the Java import and package identifiers", "scope":
                ["storage.modifier.import.java", "variable.language.wildcard.java", "storage.modifier.package.java"],
            "settings": { "foreground": "#d4d4d4" }
        }, {
            "name": "this.self", "scope": "variable.language",
            "settings": { "foreground": "#569cd6" }
        }, {
            "name": "Function declarations",
            "scope": ["entity.name.function", "support.function", "support.constant.handlebars"], "settings":
                { "foreground": "#DCDCAA" }
        }, {
            "name": "Types declaration and references", "scope": ["meta.return-type", "support.class", "support.type",
                "entity.name.type", "entity.name.class", "storage.type.cs", "storage.type.generic.cs", "storage.type.modifier.cs",
                "storage.type.variable.cs", "storage.type.annotation.java", "storage.type.generic.java", "storage.type.java",
                "storage.type.object.array.java", "storage.type.primitive.array.java", "storage.type.primitive.java", "storage.type.token.java",
                "storage.type.groovy", "storage.type.annotation.groovy", "storage.type.parameters.groovy",
                "storage.type.generic.groovy", "storage.type.object.array.groovy", "storage.type.primitive.array.groovy",
                "storage.type.primitive.groovy"], "settings": { "foreground": "#4EC9B0" }
        },
        {
            "name": "Types declaration and references, TS grammar specific", "scope": ["meta.type.cast.expr", "meta.type.new.expr",
                "support.constant.math", "support.constant.dom", "support.constant.json", "entity.other.inherited-class"],
            "settings": { "foreground": "#4EC9B0" }
        }, {
            "name": "Control flow keywords", "scope": "keyword.control",
            "settings": { "foreground": "#C586C0" }
        }, {
            "name": "Variable and parameter name",
            "scope": ["variable", "meta.definition.variable.name", "support.variable"], "settings": { "foreground": "#9CDCFE" }
        },
        {
            "name": "Object keys, TS grammar specific", "scope": ["meta.object-literal.key"],
            "settings": { "foreground": "#9CDCFE" }
        }, {
            "name": "CSS property value", "scope": ["support.constant.property-value",
                "support.constant.font-name", "support.constant.media-type", "support.constant.media",
                "constant.other.color.rgb-value", "constant.other.rgb-value", "support.constant.color"],
            "settings": { "foreground": "#CE9178" }
        }, {
            "name": "Regular expression groups", "scope": ["punctuation.definition.group.regexp",
                "punctuation.definition.group.assertion.regexp", "punctuation.definition.character-class.regexp",
                "punctuation.character.set.begin.regexp", "punctuation.character.set.end.regexp", "keyword.operator.negation.regexp",
                "support.other.parenthesis.regexp"], "settings": { "foreground": "#CE9178" }
        },
        {
            "scope": ["constant.character.character-class.regexp", "constant.other.character-class.set.regexp",
                "constant.other.character-class.regexp", "constant.character.set.regexp"], "settings": { "foreground": "#d16969" }
        },
        { "scope": ["keyword.operator.or.regexp", "keyword.control.anchor.regexp"], "settings": { "foreground": "#DCDCAA" } },
        { "scope": "keyword.operator.quantifier.regexp", "settings": { "foreground": "#d7ba7d" } },
        { "scope": "constant.character", "settings": { "foreground": "#569cd6" } }, {
            "scope": "constant.character.escape", "settings":
                { "foreground": "#d7ba7d" }
        }, { "scope": "token.info-token", "settings": { "foreground": "#6796e6" } },
        { "scope": "token.warn-token", "settings": { "foreground": "#cd9731" } }, {
            "scope": "token.error-token",
            "settings": { "foreground": "#f44747" }
        }, { "scope": "token.debug-token", "settings": { "foreground": "#b267e6" } }];
        grammarRegistry.setTheme({ name: "vscode", settings: tokenColors });
        // const colorMap = TextMateService._toColorMap(grammarRegistry.getColorMap());
        // const cssRules = generateTokensCSSForColorMap(colorMap);
        // this._styleElement.innerHTML = cssRules;
        // TokenizationRegistry.setColorMap(colorMap);
    }

    // private compareTokenRules(newRules: ITokenColorizationRule[]): boolean {
    //     let currRules = this._currentTokenColors;
    //     this._currentTokenColors = newRules;
    //     if (!newRules || !currRules || newRules.length !== currRules.length) {
    //         return true;
    //     }
    //     for (let i = newRules.length - 1; i >= 0; i--) {
    //         let r1 = newRules[i];
    //         let r2 = currRules[i];
    //         if (r1.scope !== r2.scope) {
    //             return true;
    //         }
    //         let s1 = r1.settings;
    //         let s2 = r2.settings;
    //         if (s1 && s2) {
    //             if (s1.fontStyle !== s2.fontStyle || s1.foreground !== s2.foreground || s1.background !== s2.background) {
    //                 return true;
    //             }
    //         } else if (!s1 || !s2) {
    //             return true;
    //         }
    //     }
    //     return false;
    // }

    private _handleGrammarExtensionPointUser(extensionFolderPath: string, syntax: ITMSyntaxExtensionPoint): void {
        const normalizedAbsolutePath = normalize(join(extensionFolderPath, syntax.path));
        this._scopeRegistry.register(syntax.scopeName, normalizedAbsolutePath, syntax.embeddedLanguages);

        if (syntax.injectTo) {
            for (const injectScope of syntax.injectTo) {
                let injections = this._injections[injectScope];
                if (!injections) {
                    this._injections[injectScope] = injections = [];
                }
                injections.push(syntax.scopeName);
            }

            if (syntax.embeddedLanguages) {
                for (const injectScope of syntax.injectTo) {
                    let injectedEmbeddedLanguages = this._injectedEmbeddedLanguages[injectScope];
                    if (!injectedEmbeddedLanguages) {
                        this._injectedEmbeddedLanguages[injectScope] = injectedEmbeddedLanguages = [];
                    }
                    injectedEmbeddedLanguages.push(syntax.embeddedLanguages);
                }
            }
        }

        const modeId = syntax.language;
        if (modeId) {
            this._languageToScope.set(modeId, syntax.scopeName);
        }
    }

    private _resolveEmbeddedLanguages(embeddedLanguages: IEmbeddedLanguagesMap): IEmbeddedLanguagesMap2 {
        const scopes = Object.keys(embeddedLanguages);
        const result: IEmbeddedLanguagesMap2 = Object.create(null);
        for (let i = 0, len = scopes.length; i < len; i++) {
            const scope = scopes[i];
            const language = embeddedLanguages[scope];
            const languageIdentifier = this._modeService.getLanguageIdentifier(language);
            if (languageIdentifier) {
                result[scope] = languageIdentifier.id;
            }
        }
        return result;
    }

    public createGrammar(modeId: string): Promise<IGrammar> {
        return this._createGrammar(modeId).then(r => r.grammar);
    }

    private _createGrammar(modeId: string): Promise<ICreateGrammarResult> {
        let scopeName = this._languageToScope.get(modeId);
        if (!scopeName) {
            scopeName = '';
        }
        const languageRegistration = this._scopeRegistry.getLanguageRegistration(scopeName);
        if (!languageRegistration) {
            // No TM grammar defined
            return Promise.reject<ICreateGrammarResult>(new Error("No TM Grammar registered for this language."));
        }
        const embeddedLanguages = this._resolveEmbeddedLanguages(languageRegistration.embeddedLanguages);
        const injectedEmbeddedLanguages = this._injectedEmbeddedLanguages[scopeName];
        if (injectedEmbeddedLanguages) {
            for (const injected of injectedEmbeddedLanguages.map(this._resolveEmbeddedLanguages.bind(this))) {
                for (const scope of Object.keys(injected)) {
                    embeddedLanguages[scope] = (<IEmbeddedLanguagesMap2>injected)[scope];
                }
            }
        }

        const languageId = this._modeService.getLanguageIdentifier(modeId).id;
        const containsEmbeddedLanguages = (Object.keys(embeddedLanguages).length > 0);
        return this._getOrCreateGrammarRegistry().then(_res => {
            const [grammarRegistry, initialState] = _res;
            return new Promise<ICreateGrammarResult>((c, e) => {
                if (!scopeName) {
                    console.error("Scope is undefined!");
                    scopeName = '';
                }
                grammarRegistry.loadGrammarWithEmbeddedLanguages(scopeName, languageId, embeddedLanguages, (err, grammar) => {
                    if (err) {
                        return e(err);
                    }
                    c({
                        languageId: languageId,
                        grammar: grammar,
                        initialState: initialState,
                        containsEmbeddedLanguages: containsEmbeddedLanguages
                    });
                });
            });
        });
    }

    private registerDefinition(modeId: string): void {
        this._createGrammar(modeId).then(r => {
            TokenizationRegistry.register(modeId, new TMTokenization(this._scopeRegistry, r.languageId, r.grammar, r.initialState, r.containsEmbeddedLanguages));
        }, onUnexpectedError);
    }
}

export function generateTokensCSSForColorMap(colorMap: Color[]): string {
    const rules: string[] = [];
    for (let i = 1, len = colorMap.length; i < len; i++) {
        const color = colorMap[i];
        rules[i] = `.mtk${i} { color: ${color}; }`;
    }
    rules.push('.mtki { font-style: italic; }');
    rules.push('.mtkb { font-weight: bold; }');
    rules.push('.mtku { text-decoration: underline; }');
    return rules.join('\n');
}

class TMTokenization implements ITokenizationSupport {

    private readonly _scopeRegistry: TMScopeRegistry;
    private readonly _languageId: LanguageId;
    private readonly _grammar: IGrammar;
    private readonly _containsEmbeddedLanguages: boolean;
    private readonly _seenLanguages: boolean[];
    private readonly _initialState: StackElement;

    constructor(scopeRegistry: TMScopeRegistry, languageId: LanguageId, grammar: IGrammar, initialState: StackElement, containsEmbeddedLanguages: boolean) {
        this._scopeRegistry = scopeRegistry;
        this._languageId = languageId;
        this._grammar = grammar;
        this._initialState = initialState;
        this._containsEmbeddedLanguages = containsEmbeddedLanguages;
        this._seenLanguages = [];
    }

    public getInitialState(): IState {
        return this._initialState;
    }

    public tokenize2(line: string, state: StackElement, offsetDelta: number): TokenizationResult2 {
        if (offsetDelta !== 0) {
            throw new Error('Unexpected: offsetDelta should be 0.');
        }

        // Do not attempt to tokenize if a line has over 20k
        if (line.length >= 20000) {
            console.log(`Line (${line.substr(0, 15)}...): longer than 20k characters, tokenization skipped.`);
            return nullTokenize2(this._languageId, line, state, offsetDelta);
        }

        const textMateResult = this._grammar.tokenizeLine2(line, state);

        if (this._containsEmbeddedLanguages) {
            const seenLanguages = this._seenLanguages;
            const tokens = textMateResult.tokens;

            // Must check if any of the embedded languages was hit
            for (let i = 0, len = (tokens.length >>> 1); i < len; i++) {
                const metadata = tokens[(i << 1) + 1];
                const languageId = TokenMetadata.getLanguageId(metadata);

                if (!seenLanguages[languageId]) {
                    seenLanguages[languageId] = true;
                    this._scopeRegistry.onEncounteredLanguage(languageId);
                }
            }
        }

        let endState: StackElement;
        // try to save an object if possible
        if (state.equals(textMateResult.ruleStack)) {
            endState = state;
        } else {
            endState = textMateResult.ruleStack;

        }

        return new TokenizationResult2(textMateResult.tokens, endState);
    }
}
